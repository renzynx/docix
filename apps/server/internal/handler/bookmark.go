package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type BookmarkHandler struct {
	DB *database.Database
}

func NewBookmarkHandler(db *database.Database) *BookmarkHandler {
	return &BookmarkHandler{DB: db}
}

func (h *BookmarkHandler) ListBookmarks(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())

	cursor, err := h.DB.Bookmarks.Find(r.Context(), bson.M{"user_id": user.ID})
	if err != nil {
		log.Error("Failed to list bookmarks: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list bookmarks")
		return
	}
	defer cursor.Close(r.Context())

	var bookmarks []models.Bookmark
	if err := cursor.All(r.Context(), &bookmarks); err != nil {
		log.Error("Failed to decode bookmarks: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list bookmarks")
		return
	}

	seriesIDs := make([]bson.ObjectID, len(bookmarks))
	for i, b := range bookmarks {
		seriesIDs[i] = b.SeriesID
	}

	var series []models.Series
	if len(seriesIDs) > 0 {
		seriesCursor, err := h.DB.Series.Find(r.Context(), bson.M{"_id": bson.M{"$in": seriesIDs}})
		if err == nil {
			seriesCursor.All(r.Context(), &series)
			seriesCursor.Close(r.Context())
		}
	}

	seriesMap := make(map[string]models.Series)
	for _, s := range series {
		seriesMap[s.ID.Hex()] = s
	}

	type BookmarkWithSeries struct {
		ID        string        `json:"id"`
		SeriesID  string        `json:"series_id"`
		Series    models.Series `json:"series"`
		CreatedAt time.Time     `json:"created_at"`
	}

	result := make([]BookmarkWithSeries, 0, len(bookmarks))
	for _, b := range bookmarks {
		if s, ok := seriesMap[b.SeriesID.Hex()]; ok {
			result = append(result, BookmarkWithSeries{
				ID:        b.ID.Hex(),
				SeriesID:  b.SeriesID.Hex(),
				Series:    s,
				CreatedAt: b.CreatedAt,
			})
		}
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *BookmarkHandler) GetBookmarkStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	seriesID := chi.URLParam(r, "seriesId")

	objID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	var bookmark models.Bookmark
	err = h.DB.Bookmarks.FindOne(r.Context(), bson.M{
		"user_id":   user.ID,
		"series_id": objID,
	}).Decode(&bookmark)

	if err == mongo.ErrNoDocuments {
		response.JSON(w, http.StatusOK, map[string]any{
			"bookmarked": false,
		})
		return
	}

	if err != nil {
		log.Error("Failed to check bookmark status: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to check bookmark status")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"bookmarked":  true,
		"bookmark_id": bookmark.ID.Hex(),
	})
}

func (h *BookmarkHandler) ToggleBookmark(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	seriesID := chi.URLParam(r, "seriesId")

	objID, err := bson.ObjectIDFromHex(seriesID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid series ID")
		return
	}

	var series models.Series
	err = h.DB.Series.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&series)
	if err == mongo.ErrNoDocuments {
		response.Error(w, http.StatusNotFound, "Series not found")
		return
	}
	if err != nil {
		log.Error("Failed to find series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to toggle bookmark")
		return
	}

	var existing models.Bookmark
	err = h.DB.Bookmarks.FindOne(r.Context(), bson.M{
		"user_id":   user.ID,
		"series_id": objID,
	}).Decode(&existing)

	if err == mongo.ErrNoDocuments {
		bookmark := models.Bookmark{
			UserID:    user.ID,
			SeriesID:  objID,
			CreatedAt: time.Now(),
		}

		result, err := h.DB.Bookmarks.InsertOne(r.Context(), bookmark)
		if err != nil {
			log.Error("Failed to create bookmark: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to create bookmark")
			return
		}

		response.JSON(w, http.StatusCreated, map[string]any{
			"bookmarked":  true,
			"bookmark_id": result.InsertedID.(bson.ObjectID).Hex(),
			"message":     "Bookmark added",
		})
		return
	}

	if err != nil {
		log.Error("Failed to check bookmark: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to toggle bookmark")
		return
	}

	_, err = h.DB.Bookmarks.DeleteOne(r.Context(), bson.M{"_id": existing.ID})
	if err != nil {
		log.Error("Failed to delete bookmark: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to remove bookmark")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"bookmarked": false,
		"message":    "Bookmark removed",
	})
}
