package handlers

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
	goredis "github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/apps/worker/internal/database"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type ViewSyncHandler struct {
	db          *database.Client
	viewTracker *redis.ViewTracker
	logger      *logrus.Logger
}

func NewViewSyncHandler(db *database.Client, redisClient *goredis.Client, logger *logrus.Logger) *ViewSyncHandler {
	return &ViewSyncHandler{
		db:          db,
		viewTracker: redis.NewViewTracker(redisClient),
		logger:      logger,
	}
}

func (h *ViewSyncHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	log := h.logger.WithField("task", t.Type())
	log.Info("Starting view count sync")

	pendingViews, err := h.viewTracker.GetPendingViews(ctx)
	if err != nil {
		return fmt.Errorf("failed to get pending views: %w", err)
	}

	if len(pendingViews) == 0 {
		log.Debug("No pending views to sync")
		return nil
	}

	log.WithField("count", len(pendingViews)).Info("Syncing pending view counts")

	var seriesSynced, chaptersSynced int64
	var errors []error

	for _, pv := range pendingViews {
		count, err := h.viewTracker.GetAndResetCount(ctx, pv.ResourceType, pv.ResourceID)
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to get count for %s:%s: %w", pv.ResourceType, pv.ResourceID, err))
			continue
		}

		if count == 0 {
			continue
		}

		objectID, err := bson.ObjectIDFromHex(pv.ResourceID)
		if err != nil {
			errors = append(errors, fmt.Errorf("invalid object ID %s: %w", pv.ResourceID, err))
			continue
		}

		switch pv.ResourceType {
		case "series":
			_, err = h.db.Series().UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
				"$inc": bson.M{"view_count": count},
			})
			if err != nil {
				errors = append(errors, fmt.Errorf("failed to update series %s: %w", pv.ResourceID, err))
			} else {
				seriesSynced++
			}

		case "chapter":
			_, err = h.db.Chapters().UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
				"$inc": bson.M{"view_count": count},
			})
			if err != nil {
				errors = append(errors, fmt.Errorf("failed to update chapter %s: %w", pv.ResourceID, err))
			} else {
				chaptersSynced++
			}

		default:
			log.WithField("type", pv.ResourceType).Warn("Unknown resource type")
		}
	}

	log.WithFields(logrus.Fields{
		"series_synced":   seriesSynced,
		"chapters_synced": chaptersSynced,
		"errors":          len(errors),
	}).Info("View count sync completed")

	if len(errors) > 0 {
		for _, err := range errors {
			log.WithError(err).Warn("Sync error")
		}
	}

	return nil
}
