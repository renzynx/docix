package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type MangaHandler struct {
	DB        *database.Database
	viewCache *viewRateLimiter
}

func NewMangaHandler(db *database.Database) *MangaHandler {
	return &MangaHandler{
		DB:        db,
		viewCache: newViewRateLimiter(1 * time.Hour),
	}
}

// viewRateLimiter prevents duplicate view counts from the same IP
type viewRateLimiter struct {
	mu       sync.RWMutex
	views    map[string]time.Time
	duration time.Duration
}

func newViewRateLimiter(duration time.Duration) *viewRateLimiter {
	rl := &viewRateLimiter{
		views:    make(map[string]time.Time),
		duration: duration,
	}
	go rl.cleanup()
	return rl
}

func (rl *viewRateLimiter) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, expiry := range rl.views {
			if now.After(expiry) {
				delete(rl.views, key)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *viewRateLimiter) canView(resourceType, resourceID, ipHash string) bool {
	key := resourceType + ":" + resourceID + ":" + ipHash
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if expiry, exists := rl.views[key]; exists {
		if time.Now().Before(expiry) {
			return false
		}
	}

	rl.views[key] = time.Now().Add(rl.duration)
	return true
}

func hashIP(ip string) string {
	hash := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(hash[:8])
}

func (h *MangaHandler) IncrementSeriesView(w http.ResponseWriter, r *http.Request) {
	seriesID := chi.URLParam(r, "id")
	if seriesID == "" {
		response.Error(w, http.StatusBadRequest, "Series ID is required")
		return
	}

	objectID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	clientIP := auth.GetClientIP(r)
	ipHash := hashIP(clientIP)

	if !h.viewCache.canView("series", seriesID, ipHash) {
		// Already viewed recently, return success without incrementing
		response.JSON(w, http.StatusOK, map[string]string{
			"message": "View already recorded",
		})
		return
	}

	result, err := h.DB.Series.UpdateOne(r.Context(), bson.M{"_id": objectID}, bson.M{
		"$inc": bson.M{"view_count": 1},
	})
	if err != nil {
		log.Error("Failed to increment series view: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to record view")
		return
	}

	if result.MatchedCount == 0 {
		response.Error(w, http.StatusNotFound, "Series not found")
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

	clientIP := auth.GetClientIP(r)
	ipHash := hashIP(clientIP)

	if !h.viewCache.canView("chapter", chapterID, ipHash) {
		// Already viewed recently, return success without incrementing
		response.JSON(w, http.StatusOK, map[string]string{
			"message": "View already recorded",
		})
		return
	}

	// Get the chapter to find the series ID
	var chapter struct {
		SeriesID bson.ObjectID `bson:"series_id"`
	}
	err = h.DB.Chapters.FindOne(r.Context(), bson.M{"_id": objectID}).Decode(&chapter)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	_, err = h.DB.Chapters.UpdateOne(r.Context(), bson.M{"_id": objectID}, bson.M{
		"$inc": bson.M{"view_count": 1},
	})
	if err != nil {
		log.Error("Failed to increment chapter view: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to record view")
		return
	}

	// Also increment series view count
	_, err = h.DB.Series.UpdateOne(r.Context(), bson.M{"_id": chapter.SeriesID}, bson.M{
		"$inc": bson.M{"view_count": 1},
	})
	if err != nil {
		log.Error("Failed to increment series view from chapter: ", err)
		// Don't return error, chapter view was recorded successfully
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "View recorded",
	})
}
