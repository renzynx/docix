package handler

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func (h *UploadHandler) CleanOrphanedFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uploadDir := h.config.Upload.Directory

	// 1. Get all files in upload directory
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		log.Error("Failed to read upload directory: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list files")
		return
	}

	diskFiles := make(map[string]bool)
	for _, f := range files {
		if !f.IsDir() {
			diskFiles[f.Name()] = true
		}
	}

	// 2. Get all images used in DB (series covers)
	usedFiles := make(map[string]bool)

	// Fetch series covers - use projection to only specific field
	seriesCursor, err := h.db.Series.Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"cover_image": 1}))
	if err != nil {
		log.Error("Failed to list series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to fetch database records")
		return
	}
	defer seriesCursor.Close(ctx)

	var series []models.Series
	if err := seriesCursor.All(ctx, &series); err == nil {
		for _, s := range series {
			if s.CoverImage != "" {
				usedFiles[s.CoverImage] = true
			}
		}
	}

	// Fetch pages images
	pageCursor, err := h.db.Pages.Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"image_url": 1}))
	if err != nil {
		log.Error("Failed to list pages: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to fetch database records")
		return
	}
	defer pageCursor.Close(ctx)

	var pages []models.Page
	if err := pageCursor.All(ctx, &pages); err == nil {
		for _, p := range pages {
			if p.ImageURL != "" {
				usedFiles[p.ImageURL] = true
			}
		}
	}

	// 3. Find and delete orphans
	deletedCount := 0
	reclaimedSpace := int64(0)

	for filename := range diskFiles {
		if !usedFiles[filename] {
			path := filepath.Join(uploadDir, filename)
			info, err := os.Stat(path)
			if err == nil {
				reclaimedSpace += info.Size()
				if err := os.Remove(path); err != nil {
					log.Errorf("Failed to delete orphan file %s: %v", filename, err)
					continue
				}
				deletedCount++
			}
		}
	}

	log.Infof("Cleaned orphans: %d files, %d bytes reclaimed", deletedCount, reclaimedSpace)

	response.JSON(w, http.StatusOK, map[string]any{
		"message":         "Cleanup completed",
		"deleted_count":   deletedCount,
		"reclaimed_bytes": reclaimedSpace,
		"total_files":     len(diskFiles),
	})
}
