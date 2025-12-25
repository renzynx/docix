package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

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
	pendingDir := h.config.PendingUploadDir

	// Clean up orphaned files in the main upload directory
	uploadDeletedCount, uploadReclaimedSpace, err := h.cleanupUploadDirectory(ctx, uploadDir)
	if err != nil {
		return err
	}

	// Clean up stale files in the pending directory (files that failed processing)
	pendingDeletedCount, pendingReclaimedSpace := h.cleanupPendingDirectory(pendingDir)

	totalDeleted := uploadDeletedCount + pendingDeletedCount
	totalReclaimed := uploadReclaimedSpace + pendingReclaimedSpace

	h.logger.WithFields(logrus.Fields{
		"upload_deleted":  uploadDeletedCount,
		"pending_deleted": pendingDeletedCount,
		"total_deleted":   totalDeleted,
		"reclaimed_bytes": totalReclaimed,
	}).Info("Cleanup completed")

	resultData := map[string]any{
		"upload_deleted":  uploadDeletedCount,
		"pending_deleted": pendingDeletedCount,
		"total_deleted":   totalDeleted,
		"reclaimed_bytes": totalReclaimed,
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

// cleanupUploadDirectory removes files in the upload directory that are not referenced in the database
func (h *CleanupHandler) cleanupUploadDirectory(ctx context.Context, uploadDir string) (int, int64, error) {
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to read upload directory: %w", err)
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
		return 0, 0, fmt.Errorf("failed to list series: %w", err)
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
		return 0, 0, fmt.Errorf("failed to list pages: %w", err)
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

	return deletedCount, reclaimedSpace, nil
}

// cleanupPendingDirectory removes stale files in the pending directory that are older than 1 hour
// (files should be processed within seconds, so 1 hour is generous for failed tasks)
func (h *CleanupHandler) cleanupPendingDirectory(pendingDir string) (int, int64) {
	if pendingDir == "" {
		return 0, 0
	}

	files, err := os.ReadDir(pendingDir)
	if err != nil {
		h.logger.Warnf("Failed to read pending directory: %v", err)
		return 0, 0
	}

	deletedCount := 0
	reclaimedSpace := int64(0)
	staleThreshold := time.Now().Add(-1 * time.Hour)

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		path := filepath.Join(pendingDir, f.Name())
		info, err := os.Stat(path)
		if err != nil {
			continue
		}

		// Only delete files older than the stale threshold
		if info.ModTime().Before(staleThreshold) {
			reclaimedSpace += info.Size()
			if err := os.Remove(path); err != nil {
				h.logger.Warnf("Failed to delete stale pending file %s: %v", f.Name(), err)
				continue
			}
			deletedCount++
			h.logger.Debugf("Deleted stale pending file: %s (age: %v)", f.Name(), time.Since(info.ModTime()))
		}
	}

	return deletedCount, reclaimedSpace
}
