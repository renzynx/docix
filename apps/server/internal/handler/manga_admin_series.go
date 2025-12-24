package handler

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func (h *MangaAdminHandler) ListSeries(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	sortBy := r.URL.Query().Get("sort_by")
	order := r.URL.Query().Get("order")

	filter := bson.M{}
	if status != "" {
		validStatuses := map[string]bool{
			"ongoing":   true,
			"completed": true,
			"hiatus":    true,
			"cancelled": true,
		}
		if validStatuses[status] {
			filter["status"] = status
		}
	}
	if search != "" {
		filter["$text"] = bson.M{"$search": search}
	}

	sortField := "created_at"
	sortOrder := -1
	if sortBy != "" {
		switch sortBy {
		case "title", "created_at", "updated_at", "view_count", "chapter_count":
			sortField = sortBy
		}
	}
	if order == "asc" {
		sortOrder = 1
	}

	total, err := h.DB.Series.CountDocuments(r.Context(), filter)
	if err != nil {
		log.Error("Failed to count series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to count series")
		return
	}

	skip := int64((page - 1) * limit)
	cursor, err := h.DB.Series.Find(r.Context(), filter,
		options.Find().
			SetSort(bson.D{{Key: sortField, Value: sortOrder}}).
			SetSkip(skip).
			SetLimit(int64(limit)),
	)
	if err != nil {
		log.Error("Failed to list series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list series")
		return
	}
	defer cursor.Close(r.Context())

	var seriesList []models.Series
	if err := cursor.All(r.Context(), &seriesList); err != nil {
		log.Error("Failed to decode series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to decode series")
		return
	}

	for i := range seriesList {
		seriesList[i].CoverImageURL = h.signCoverImage(seriesList[i].CoverImage)

		if len(seriesList[i].TagIDs) > 0 {
			tagCursor, err := h.DB.Tags.Find(r.Context(), bson.M{"_id": bson.M{"$in": seriesList[i].TagIDs}})
			if err == nil {
				var tags []models.Tag
				if err := tagCursor.All(r.Context(), &tags); err == nil {
					seriesList[i].Tags = tags
				}
				tagCursor.Close(r.Context())
			}
		}
	}

	if seriesList == nil {
		seriesList = []models.Series{}
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	resp := models.PaginatedResponse[models.Series]{
		Data:       seriesList,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *MangaAdminHandler) CreateSeries(w http.ResponseWriter, r *http.Request) {
	req, ok := validator.HandleRequest[models.CreateSeriesRequest](w, r)
	if !ok {
		return
	}

	var tagIDs []bson.ObjectID
	for _, id := range req.TagIDs {
		objID, err := bson.ObjectIDFromHex(id)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "Invalid tag ID: "+id)
			return
		}
		tagIDs = append(tagIDs, objID)
	}

	now := time.Now()
	series := &models.Series{
		Title:        req.Title,
		Slug:         slugify(req.Title),
		Description:  req.Description,
		CoverImage:   req.CoverImage,
		Author:       req.Author,
		Artist:       req.Artist,
		Status:       models.SeriesStatus(req.Status),
		TagIDs:       tagIDs,
		ViewCount:    0,
		ChapterCount: 0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	result, err := h.DB.Series.InsertOne(r.Context(), series)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Series with this title already exists")
			return
		}
		log.Error("Failed to create series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create series")
		return
	}

	series.ID = result.InsertedID.(bson.ObjectID)

	if len(tagIDs) > 0 {
		tagCursor, err := h.DB.Tags.Find(r.Context(), bson.M{"_id": bson.M{"$in": tagIDs}})
		if err == nil {
			var tags []models.Tag
			if err := tagCursor.All(r.Context(), &tags); err == nil {
				series.Tags = tags
			}
			tagCursor.Close(r.Context())
		}
	}

	series.CoverImageURL = h.signCoverImage(series.CoverImage)

	response.JSON(w, http.StatusCreated, series)
}

func (h *MangaAdminHandler) GetSeries(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	var series models.Series
	err = h.DB.Series.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&series)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Series not found")
			return
		}
		log.Error("Failed to get series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get series")
		return
	}

	if len(series.TagIDs) > 0 {
		tagCursor, err := h.DB.Tags.Find(r.Context(), bson.M{"_id": bson.M{"$in": series.TagIDs}})
		if err == nil {
			var tags []models.Tag
			if err := tagCursor.All(r.Context(), &tags); err == nil {
				series.Tags = tags
			}
			tagCursor.Close(r.Context())
		}
	}

	series.CoverImageURL = h.signCoverImage(series.CoverImage)

	response.JSON(w, http.StatusOK, series)
}

func (h *MangaAdminHandler) UpdateSeries(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	req, ok := validator.HandleRequest[models.UpdateSeriesRequest](w, r)
	if !ok {
		return
	}

	updates := bson.M{"updated_at": time.Now()}

	if req.Title != nil {
		updates["title"] = *req.Title
		updates["slug"] = slugify(*req.Title)
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CoverImage != nil {
		updates["cover_image"] = *req.CoverImage
	}
	if req.Author != nil {
		updates["author"] = *req.Author
	}
	if req.Artist != nil {
		updates["artist"] = *req.Artist
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.TagIDs != nil {
		var tagIDs []bson.ObjectID
		for _, id := range req.TagIDs {
			tagObjID, err := bson.ObjectIDFromHex(id)
			if err != nil {
				response.Error(w, http.StatusBadRequest, "Invalid tag ID: "+id)
				return
			}
			tagIDs = append(tagIDs, tagObjID)
		}
		updates["tag_ids"] = tagIDs
	}

	result, err := h.DB.Series.UpdateOne(r.Context(), bson.M{"_id": objID}, bson.M{"$set": updates})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Series with this title already exists")
			return
		}
		log.Error("Failed to update series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update series")
		return
	}

	if result.MatchedCount == 0 {
		response.Error(w, http.StatusNotFound, "Series not found")
		return
	}

	var series models.Series
	h.DB.Series.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&series)

	if len(series.TagIDs) > 0 {
		tagCursor, err := h.DB.Tags.Find(r.Context(), bson.M{"_id": bson.M{"$in": series.TagIDs}})
		if err == nil {
			var tags []models.Tag
			if err := tagCursor.All(r.Context(), &tags); err == nil {
				series.Tags = tags
			}
			tagCursor.Close(r.Context())
		}
	}

	series.CoverImageURL = h.signCoverImage(series.CoverImage)

	response.JSON(w, http.StatusOK, series)
}

func (h *MangaAdminHandler) DeleteSeries(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	chapterCursor, err := h.DB.Chapters.Find(r.Context(), bson.M{"series_id": objID})
	if err == nil {
		var chapters []models.Chapter
		if err := chapterCursor.All(r.Context(), &chapters); err == nil {
			for _, chapter := range chapters {
				h.DB.Pages.DeleteMany(r.Context(), bson.M{"chapter_id": chapter.ID})
			}
		}
		chapterCursor.Close(r.Context())
	}

	h.DB.Chapters.DeleteMany(r.Context(), bson.M{"series_id": objID})

	h.DB.Bookmarks.DeleteMany(r.Context(), bson.M{"series_id": objID})

	result, err := h.DB.Series.DeleteOne(r.Context(), bson.M{"_id": objID})
	if err != nil {
		log.Error("Failed to delete series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to delete series")
		return
	}

	if result.DeletedCount == 0 {
		response.Error(w, http.StatusNotFound, "Series not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Series deleted successfully"})
}
