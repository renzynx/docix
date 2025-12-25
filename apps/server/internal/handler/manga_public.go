package handler

import (
	"context"
	"math"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/packages/go/signing"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type CDNSettingsProvider interface {
	IsCDNEnabled(ctx context.Context) bool
	GetCDNBaseURL(ctx context.Context) string
}

type MangaPublicHandler struct {
	DB       *database.Database
	Signer   *signing.Signer
	Settings CDNSettingsProvider
}

func NewMangaPublicHandler(db *database.Database, signer *signing.Signer, settings CDNSettingsProvider) *MangaPublicHandler {
	return &MangaPublicHandler{DB: db, Signer: signer, Settings: settings}
}

func (h *MangaPublicHandler) signImageURL(ctx context.Context, filename string) string {
	if filename == "" {
		return ""
	}
	if h.Settings != nil && !h.Settings.IsCDNEnabled(ctx) {
		return filename
	}
	return h.Signer.GenerateSignedURL(filename)
}

func (h *MangaPublicHandler) ListSeries(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 20
	}

	status := r.URL.Query().Get("status")
	tag := r.URL.Query().Get("tag")
	search := r.URL.Query().Get("search")
	sort := r.URL.Query().Get("sort")

	filter := bson.M{}
	if status != "" {
		// Valid status values
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
	if tag != "" {
		var tagDoc models.Tag
		err := h.DB.Tags.FindOne(r.Context(), bson.M{"slug": tag}).Decode(&tagDoc)
		if err == nil {
			filter["tag_ids"] = tagDoc.ID
		}
	}

	var sortField string
	sortOrder := -1
	// Valid sort fields
	validSorts := map[string]string{
		"popular":      "view_count",
		"alphabetical": "title",
		"updated":      "updated_at",
		"created":      "created_at",
	}

	if field, ok := validSorts[sort]; ok {
		sortField = field
		if sort == "alphabetical" {
			sortOrder = 1
		}
	} else {
		sortField = "created_at"
	}

	total, err := h.DB.Series.CountDocuments(r.Context(), filter)
	if err != nil {
		log.Error("Failed to count series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list series")
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
		seriesList[i].CoverImageURL = h.signImageURL(r.Context(), seriesList[i].CoverImage)
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

func (h *MangaPublicHandler) GetSeriesBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.Error(w, http.StatusBadRequest, "Slug is required")
		return
	}

	var series models.Series
	err := h.DB.Series.FindOne(r.Context(), bson.M{"slug": slug}).Decode(&series)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Series not found")
			return
		}
		log.Error("Failed to get series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get series")
		return
	}

	series.CoverImageURL = h.signImageURL(r.Context(), series.CoverImage)

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

	chapterCursor, err := h.DB.Chapters.Find(r.Context(),
		bson.M{"series_id": series.ID},
		options.Find().SetSort(bson.D{{Key: "number", Value: -1}}),
	)
	if err != nil {
		log.Error("Failed to get chapters: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get chapters")
		return
	}
	defer chapterCursor.Close(r.Context())

	var chapters []models.Chapter
	if err := chapterCursor.All(r.Context(), &chapters); err != nil {
		log.Error("Failed to decode chapters: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to decode chapters")
		return
	}

	if chapters == nil {
		chapters = []models.Chapter{}
	}

	resp := models.SeriesWithChapters{
		Series:   series,
		Chapters: chapters,
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *MangaPublicHandler) GetChapter(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	chapterNumStr := chi.URLParam(r, "number")

	if slug == "" || chapterNumStr == "" {
		response.Error(w, http.StatusBadRequest, "Slug and chapter number required")
		return
	}

	chapterNum, err := strconv.ParseFloat(chapterNumStr, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter number")
		return
	}

	var series models.Series
	err = h.DB.Series.FindOne(r.Context(), bson.M{"slug": slug}).Decode(&series)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Series not found")
			return
		}
		log.Error("Failed to get series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get series")
		return
	}

	var chapter models.Chapter
	err = h.DB.Chapters.FindOne(r.Context(), bson.M{
		"series_id": series.ID,
		"number":    chapterNum,
	}).Decode(&chapter)
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
		bson.M{"chapter_id": chapter.ID},
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

	for i := range pages {
		pages[i].ImageURLSigned = h.signImageURL(r.Context(), pages[i].ImageURL)
	}

	if pages == nil {
		pages = []models.Page{}
	}

	var prevChapter, nextChapter *models.ChapterNav

	var prevCh models.Chapter
	err = h.DB.Chapters.FindOne(r.Context(),
		bson.M{"series_id": series.ID, "number": bson.M{"$lt": chapterNum}},
		options.FindOne().SetSort(bson.D{{Key: "number", Value: -1}}),
	).Decode(&prevCh)
	if err == nil {
		prevChapter = &models.ChapterNav{
			ID:     prevCh.ID.Hex(),
			Number: prevCh.Number,
			Title:  prevCh.Title,
		}
	}

	var nextCh models.Chapter
	err = h.DB.Chapters.FindOne(r.Context(),
		bson.M{"series_id": series.ID, "number": bson.M{"$gt": chapterNum}},
		options.FindOne().SetSort(bson.D{{Key: "number", Value: 1}}),
	).Decode(&nextCh)
	if err == nil {
		nextChapter = &models.ChapterNav{
			ID:     nextCh.ID.Hex(),
			Number: nextCh.Number,
			Title:  nextCh.Title,
		}
	}

	resp := models.ChapterReader{
		Chapter:       chapter,
		SeriesSlug:    series.Slug,
		SeriesTitle:   series.Title,
		TotalChapters: series.ChapterCount,
		Pages:         pages,
		PrevChapter:   prevChapter,
		NextChapter:   nextChapter,
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *MangaPublicHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	cursor, err := h.DB.Tags.Find(r.Context(), bson.M{},
		options.Find().SetSort(bson.D{{Key: "name", Value: 1}}),
	)
	if err != nil {
		log.Error("Failed to list tags: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list tags")
		return
	}
	defer cursor.Close(r.Context())

	var tags []models.Tag
	if err := cursor.All(r.Context(), &tags); err != nil {
		log.Error("Failed to decode tags: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to decode tags")
		return
	}

	if tags == nil {
		tags = []models.Tag{}
	}

	response.JSON(w, http.StatusOK, tags)
}
