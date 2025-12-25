package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/apps/worker/internal/config"
	"github.com/renzynx/docix/apps/worker/internal/database"
	"github.com/renzynx/docix/apps/worker/internal/tasks"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type CleanupHandler struct {
	db     *database.Client
	config *config.Config
	redis  *redis.Client
	logger *logrus.Entry
}

func NewCleanupHandler(db *database.Client, cfg *config.Config, redisClient *redis.Client, logger *logrus.Logger) *CleanupHandler {
	return &CleanupHandler{
		db:     db,
		config: cfg,
		redis:  redisClient,
		logger: logger.WithField("handler", "cleanup"),
	}
}

func (h *CleanupHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	switch t.Type() {
	case tasks.TypeCleanupOrphans:
		return h.handleCleanupOrphans(ctx, t)
	default:
		return fmt.Errorf("unknown task type: %s", t.Type())
	}
}

func (h *CleanupHandler) handleCleanupOrphans(ctx context.Context, t *asynq.Task) error {
	uploadDir := h.config.UploadDir

	files, err := os.ReadDir(uploadDir)
	if err != nil {
		return fmt.Errorf("failed to read upload directory: %w", err)
	}

	diskFiles := make(map[string]bool)
	for _, f := range files {
		if !f.IsDir() {
			diskFiles[f.Name()] = true
		}
	}

	usedFiles := make(map[string]bool)

	seriesCursor, err := h.db.Series().Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"cover_image": 1}))
	if err != nil {
		return fmt.Errorf("failed to list series: %w", err)
	}
	defer seriesCursor.Close(ctx)

	var series []bson.M
	if err := seriesCursor.All(ctx, &series); err == nil {
		for _, s := range series {
			if coverImage, ok := s["cover_image"].(string); ok && coverImage != "" {
				usedFiles[coverImage] = true
			}
		}
	}

	pageCursor, err := h.db.Pages().Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"image_url": 1}))
	if err != nil {
		return fmt.Errorf("failed to list pages: %w", err)
	}
	defer pageCursor.Close(ctx)

	var pages []bson.M
	if err := pageCursor.All(ctx, &pages); err == nil {
		for _, p := range pages {
			if imageURL, ok := p["image_url"].(string); ok && imageURL != "" {
				usedFiles[imageURL] = true
			}
		}
	}

	deletedCount := 0
	reclaimedSpace := int64(0)

	for filename := range diskFiles {
		if !usedFiles[filename] {
			path := filepath.Join(uploadDir, filename)
			info, err := os.Stat(path)
			if err == nil {
				reclaimedSpace += info.Size()
				if err := os.Remove(path); err != nil {
					h.logger.Warnf("Failed to delete orphan file %s: %v", filename, err)
					continue
				}
				deletedCount++
			}
		}
	}

	h.logger.WithFields(logrus.Fields{
		"deleted_count":   deletedCount,
		"reclaimed_bytes": reclaimedSpace,
		"total_files":     len(diskFiles),
	}).Info("Cleanup completed")

	resultData := map[string]any{
		"deleted_count":   deletedCount,
		"reclaimed_bytes": reclaimedSpace,
		"total_files":     len(diskFiles),
	}

	resultJSON, err := json.Marshal(resultData)
	if err != nil {
		h.logger.Warnf("Failed to marshal result: %v", err)
		return nil
	}

	if _, err := t.ResultWriter().Write(resultJSON); err != nil {
		h.logger.Warnf("Failed to write task result: %v", err)
	}

	return nil
}
