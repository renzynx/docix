package handler

import (
	"net/http"
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

func (h *MangaAdminHandler) ListChapters(w http.ResponseWriter, r *http.Request) {
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

	cursor, err := h.DB.Chapters.Find(r.Context(),
		bson.M{"series_id": objID},
		options.Find().SetSort(bson.D{{Key: "number", Value: 1}}),
	)
	if err != nil {
		log.Error("Failed to list chapters: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list chapters")
		return
	}
	defer cursor.Close(r.Context())

	var chapters []models.Chapter
	if err := cursor.All(r.Context(), &chapters); err != nil {
		log.Error("Failed to decode chapters: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to decode chapters")
		return
	}

	if chapters == nil {
		chapters = []models.Chapter{}
	}

	response.JSON(w, http.StatusOK, chapters)
}

func (h *MangaAdminHandler) CreateChapter(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID required")
		return
	}

	seriesObjID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	count, err := h.DB.Series.CountDocuments(r.Context(), bson.M{"_id": seriesObjID})
	if err != nil || count == 0 {
		response.Error(w, http.StatusNotFound, "Series not found")
		return
	}

	req, ok := validator.HandleRequest[models.CreateChapterRequest](w, r)
	if !ok {
		return
	}

	now := time.Now()
	chapter := &models.Chapter{
		SeriesID:  seriesObjID,
		Number:    req.Number,
		Title:     req.Title,
		PageCount: 0,
		ViewCount: 0,
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := h.DB.Chapters.InsertOne(r.Context(), chapter)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Chapter with this number already exists")
			return
		}
		log.Error("Failed to create chapter: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create chapter")
		return
	}

	chapter.ID = result.InsertedID.(bson.ObjectID)

	// Update series chapter count
	h.DB.Series.UpdateOne(r.Context(),
		bson.M{"_id": seriesObjID},
		bson.M{
			"$inc": bson.M{"chapter_count": 1},
			"$set": bson.M{"updated_at": now},
		},
	)

	response.JSON(w, http.StatusCreated, chapter)
}

func (h *MangaAdminHandler) GetChapter(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var chapter models.Chapter
	err = h.DB.Chapters.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&chapter)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Chapter not found")
			return
		}
		log.Error("Failed to get chapter: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get chapter")
		return
	}

	pageCursor, err := h.DB.Pages.Find(r.Context(),
		bson.M{"chapter_id": objID},
		options.Find().SetSort(bson.D{{Key: "number", Value: 1}}),
	)
	if err != nil {
		log.Error("Failed to get pages: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get pages")
		return
	}
	defer pageCursor.Close(r.Context())

	var pages []models.Page
	if err := pageCursor.All(r.Context(), &pages); err != nil {
		log.Error("Failed to decode pages: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to decode pages")
		return
	}

	if pages == nil {
		pages = []models.Page{}
	}

	for i := range pages {
		pages[i].ImageURLSigned = h.signCoverImage(pages[i].ImageURL)
	}

	resp := models.ChapterWithPages{
		ID:        chapter.ID,
		SeriesID:  chapter.SeriesID,
		Number:    chapter.Number,
		Title:     chapter.Title,
		PageCount: chapter.PageCount,
		ViewCount: chapter.ViewCount,
		CreatedAt: chapter.CreatedAt,
		UpdatedAt: chapter.UpdatedAt,
		Pages:     pages,
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *MangaAdminHandler) UpdateChapter(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	req, ok := validator.HandleRequest[models.UpdateChapterRequest](w, r)
	if !ok {
		return
	}

	updates := bson.M{"updated_at": time.Now()}
	if req.Number != nil {
		updates["number"] = *req.Number
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}

	result, err := h.DB.Chapters.UpdateOne(r.Context(), bson.M{"_id": objID}, bson.M{"$set": updates})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Chapter with this number already exists")
			return
		}
		log.Error("Failed to update chapter: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update chapter")
		return
	}

	if result.MatchedCount == 0 {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Chapter updated successfully"})
}

func (h *MangaAdminHandler) DeleteChapter(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var chapter models.Chapter
	err = h.DB.Chapters.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&chapter)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Chapter not found")
			return
		}
		log.Error("Failed to get chapter: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get chapter")
		return
	}

	h.DB.Pages.DeleteMany(r.Context(), bson.M{"chapter_id": objID})

	result, err := h.DB.Chapters.DeleteOne(r.Context(), bson.M{"_id": objID})
	if err != nil {
		log.Error("Failed to delete chapter: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to delete chapter")
		return
	}

	if result.DeletedCount == 0 {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	// Update series chapter count
	h.DB.Series.UpdateOne(r.Context(),
		bson.M{"_id": chapter.SeriesID},
		bson.M{
			"$inc": bson.M{"chapter_count": -1},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)

	response.JSON(w, http.StatusOK, map[string]string{"message": "Chapter deleted successfully"})
}
