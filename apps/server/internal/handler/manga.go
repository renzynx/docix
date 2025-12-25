package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type MangaHandler struct {
	DB          *database.Database
	ViewTracker *redis.ViewTracker
}

func NewMangaHandler(db *database.Database) *MangaHandler {
	return &MangaHandler{
		DB:          db,
		ViewTracker: redis.NewViewTracker(redis.MustGetClient()),
	}
}

// getViewIdentifier returns a unique identifier for view deduplication.
// Uses session ID if available (handles both logged-in users and guests),
// falls back to IP hash for unauthenticated requests.
func getViewIdentifier(r *http.Request) string {
	if sess := middleware.GetSessionFromContext(r.Context()); sess != nil {
		return hashIdentifier(sess.ID)
	}
	return hashIdentifier(auth.GetClientIP(r))
}

func hashIdentifier(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:8])
}

func (h *MangaHandler) IncrementSeriesView(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID is required")
		return
	}

	if _, err := bson.ObjectIDFromHex(seriesID); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	identifier := getViewIdentifier(r)

	isNew, err := h.ViewTracker.RecordView(r.Context(), "series", seriesID, identifier)
	if err != nil {
		log.WithError(err).Error("Failed to record series view")
		response.Error(w, http.StatusInternalServerError, "Failed to record view")
		return
	}

	if !isNew {
		response.JSON(w, http.StatusOK, map[string]string{
			"message": "View already recorded",
		})
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "View recorded",
	})
}

func (h *MangaHandler) IncrementChapterView(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID is required")
		return
	}

	objectID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	// Verify chapter exists and get series ID for the series view
	var chapter struct {
		SeriesID bson.ObjectID `bson:"series_id"`
	}
	if err := h.DB.Chapters.FindOne(r.Context(), bson.M{"_id": objectID}).Decode(&chapter); err != nil {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	identifier := getViewIdentifier(r)

	// Record chapter view
	isNew, err := h.ViewTracker.RecordView(r.Context(), "chapter", chapterID, identifier)
	if err != nil {
		log.WithError(err).Error("Failed to record chapter view")
		response.Error(w, http.StatusInternalServerError, "Failed to record view")
		return
	}

	if !isNew {
		response.JSON(w, http.StatusOK, map[string]string{
			"message": "View already recorded",
		})
		return
	}

	// Also record a series view (reading a chapter counts as viewing the series)
	if _, err := h.ViewTracker.RecordView(r.Context(), "series", chapter.SeriesID.Hex(), identifier); err != nil {
		log.WithError(err).Warn("Failed to record series view from chapter")
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "View recorded",
	})
}
