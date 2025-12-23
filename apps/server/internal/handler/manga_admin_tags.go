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

func (h *MangaAdminHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	cursor, err := h.DB.Tags.Find(r.Context(), bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
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

func (h *MangaAdminHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
	req, ok := validator.HandleRequest[models.CreateTagRequest](w, r)
	if !ok {
		return
	}

	now := time.Now()
	tag := &models.Tag{
		Name:        req.Name,
		Slug:        slugify(req.Name),
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	result, err := h.DB.Tags.InsertOne(r.Context(), tag)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Tag with this name already exists")
			return
		}
		log.Error("Failed to create tag: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create tag")
		return
	}

	tag.ID = result.InsertedID.(bson.ObjectID)
	response.JSON(w, http.StatusCreated, tag)
}

func (h *MangaAdminHandler) UpdateTag(w http.ResponseWriter, r *http.Request) {
	tagID := chi.URLParam(r, "id")
	if tagID == "" {
		response.Error(w, http.StatusBadRequest, "Tag ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(tagID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	req, ok := validator.HandleRequest[models.UpdateTagRequest](w, r)
	if !ok {
		return
	}

	updates := bson.M{"updated_at": time.Now()}
	if req.Name != nil {
		updates["name"] = *req.Name
		updates["slug"] = slugify(*req.Name)
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	result, err := h.DB.Tags.UpdateOne(r.Context(), bson.M{"_id": objID}, bson.M{"$set": updates})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Tag with this name already exists")
			return
		}
		log.Error("Failed to update tag: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update tag")
		return
	}

	if result.MatchedCount == 0 {
		response.Error(w, http.StatusNotFound, "Tag not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Tag updated successfully"})
}

func (h *MangaAdminHandler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	tagID := chi.URLParam(r, "id")
	if tagID == "" {
		response.Error(w, http.StatusBadRequest, "Tag ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(tagID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	// Remove tag from all series that have it
	_, err = h.DB.Series.UpdateMany(r.Context(),
		bson.M{"tag_ids": objID},
		bson.M{"$pull": bson.M{"tag_ids": objID}},
	)
	if err != nil {
		log.Error("Failed to remove tag from series: ", err)
	}

	result, err := h.DB.Tags.DeleteOne(r.Context(), bson.M{"_id": objID})
	if err != nil {
		log.Error("Failed to delete tag: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to delete tag")
		return
	}

	if result.DeletedCount == 0 {
		response.Error(w, http.StatusNotFound, "Tag not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Tag deleted successfully"})
}
