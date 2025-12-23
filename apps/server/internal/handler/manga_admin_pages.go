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
)

func (h *MangaAdminHandler) AddPages(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID required")
		return
	}

	chapterObjID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	count, err := h.DB.Chapters.CountDocuments(r.Context(), bson.M{"_id": chapterObjID})
	if err != nil || count == 0 {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	req, ok := validator.HandleRequest[models.CreatePagesRequest](w, r)
	if !ok {
		return
	}

	now := time.Now()
	var pages []interface{}
	for _, item := range req.Pages {
		page := models.Page{
			ID:        bson.NewObjectID(),
			ChapterID: chapterObjID,
			Number:    item.Number,
			ImageURL:  item.ImageURL,
			CreatedAt: now,
		}
		pages = append(pages, page)
	}

	_, err = h.DB.Pages.InsertMany(r.Context(), pages)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Some pages with these numbers already exist")
			return
		}
		log.Error("Failed to add pages: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to add pages")
		return
	}

	// Update chapter page count
	h.DB.Chapters.UpdateOne(r.Context(),
		bson.M{"_id": chapterObjID},
		bson.M{
			"$inc": bson.M{"page_count": len(req.Pages)},
			"$set": bson.M{"updated_at": now},
		},
	)

	response.JSON(w, http.StatusCreated, map[string]any{
		"message": "Pages added successfully",
		"count":   len(req.Pages),
	})
}

func (h *MangaAdminHandler) UpdatePage(w http.ResponseWriter, r *http.Request) {
	pageID := chi.URLParam(r, "id")
	if pageID == "" {
		response.Error(w, http.StatusBadRequest, "Page ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(pageID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid page ID")
		return
	}

	req, ok := validator.HandleRequest[models.UpdatePageRequest](w, r)
	if !ok {
		return
	}

	if req.Number == nil {
		response.Error(w, http.StatusBadRequest, "No updates provided")
		return
	}

	result, err := h.DB.Pages.UpdateOne(r.Context(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"number": *req.Number}},
	)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Page with this number already exists")
			return
		}
		log.Error("Failed to update page: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update page")
		return
	}

	if result.MatchedCount == 0 {
		response.Error(w, http.StatusNotFound, "Page not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Page updated successfully"})
}

func (h *MangaAdminHandler) DeletePage(w http.ResponseWriter, r *http.Request) {
	pageID := chi.URLParam(r, "id")
	if pageID == "" {
		response.Error(w, http.StatusBadRequest, "Page ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(pageID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid page ID")
		return
	}

	var page models.Page
	err = h.DB.Pages.FindOne(r.Context(), bson.M{"_id": objID}).Decode(&page)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Page not found")
			return
		}
		log.Error("Failed to get page: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get page")
		return
	}

	result, err := h.DB.Pages.DeleteOne(r.Context(), bson.M{"_id": objID})
	if err != nil {
		log.Error("Failed to delete page: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to delete page")
		return
	}

	if result.DeletedCount == 0 {
		response.Error(w, http.StatusNotFound, "Page not found")
		return
	}

	// Update chapter page count
	h.DB.Chapters.UpdateOne(r.Context(),
		bson.M{"_id": page.ChapterID},
		bson.M{
			"$inc": bson.M{"page_count": -1},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)

	response.JSON(w, http.StatusOK, map[string]string{"message": "Page deleted successfully"})
}

func (h *MangaAdminHandler) ReorderPages(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	if chapterID == "" {
		response.Error(w, http.StatusBadRequest, "Chapter ID required")
		return
	}

	chapterObjID, err := bson.ObjectIDFromHex(chapterID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	count, err := h.DB.Chapters.CountDocuments(r.Context(), bson.M{"_id": chapterObjID})
	if err != nil || count == 0 {
		response.Error(w, http.StatusNotFound, "Chapter not found")
		return
	}

	req, ok := validator.HandleRequest[models.ReorderPagesRequest](w, r)
	if !ok {
		return
	}

	// Two-phase update to avoid unique index conflicts on (chapter_id, number)
	// Phase 1: Set all pages to temporary negative numbers
	for i, po := range req.PageOrders {
		pageObjID, err := bson.ObjectIDFromHex(po.PageID)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "Invalid page ID: "+po.PageID)
			return
		}

		// Use negative numbers as temporary values (-(i+1) to ensure uniqueness)
		_, err = h.DB.Pages.UpdateOne(r.Context(),
			bson.M{"_id": pageObjID, "chapter_id": chapterObjID},
			bson.M{"$set": bson.M{"number": -(i + 1)}},
		)
		if err != nil {
			log.Error("Failed to set temporary page number: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to reorder pages")
			return
		}
	}

	// Phase 2: Set all pages to their final positive numbers
	for _, po := range req.PageOrders {
		pageObjID, err := bson.ObjectIDFromHex(po.PageID)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "Invalid page ID: "+po.PageID)
			return
		}

		_, err = h.DB.Pages.UpdateOne(r.Context(),
			bson.M{"_id": pageObjID, "chapter_id": chapterObjID},
			bson.M{"$set": bson.M{"number": po.Number}},
		)
		if err != nil {
			log.Error("Failed to reorder page: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to reorder pages")
			return
		}
	}

	h.DB.Chapters.UpdateOne(r.Context(),
		bson.M{"_id": chapterObjID},
		bson.M{"$set": bson.M{"updated_at": time.Now()}},
	)

	response.JSON(w, http.StatusOK, map[string]string{"message": "Pages reordered successfully"})
}
