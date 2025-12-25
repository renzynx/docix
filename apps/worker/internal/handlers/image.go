package handlers

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/apps/worker/internal/processor"
	"github.com/renzynx/docix/apps/worker/internal/tasks"
	"github.com/sirupsen/logrus"
)

type ImageHandler struct {
	processor *processor.ImageProcessor
	redis     *redis.Client
	logger    *logrus.Entry
}

func NewImageHandler(proc *processor.ImageProcessor, redisClient *redis.Client, logger *logrus.Logger) *ImageHandler {
	return &ImageHandler{
		processor: proc,
		redis:     redisClient,
		logger:    logger.WithField("handler", "image"),
	}
}

func (h *ImageHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	switch t.Type() {
	case tasks.TypeImageConvert:
		return h.handleImageConvert(ctx, t)
	case tasks.TypeImageThumbnail:
		return h.handleImageThumbnail(ctx, t)
	default:
		return fmt.Errorf("unknown task type: %s", t.Type())
	}
}

func (h *ImageHandler) handleImageConvert(ctx context.Context, t *asynq.Task) error {
	payload, err := tasks.ParseImageConvertPayload(t)
	if err != nil {
		return fmt.Errorf("failed to parse payload: %w: %w", err, asynq.SkipRetry)
	}

	log := h.logger.WithFields(logrus.Fields{
		"upload_id": payload.UploadID,
		"source":    payload.SourcePath,
		"target":    payload.TargetPath,
		"format":    payload.TargetFormat,
	})

	log.Info("Starting image conversion")

	if err := h.updateUploadStatus(ctx, payload.UploadID, "processing", ""); err != nil {
		log.WithError(err).Warn("Failed to update status to processing")
	}

	start := time.Now()

	format := processor.FormatFromString(payload.TargetFormat)

	result, err := h.processor.Convert(payload.SourcePath, payload.TargetPath, processor.ConvertOptions{
		Quality:   payload.Quality,
		Format:    format,
		MaxWidth:  payload.MaxWidth,
		MaxHeight: payload.MaxHeight,
	})
	if err != nil {
		if statusErr := h.updateUploadStatus(ctx, payload.UploadID, "failed", err.Error()); statusErr != nil {
			log.WithError(statusErr).Warn("Failed to update status to failed")
		}
		// Clean up source file on failure to prevent orphans in pending directory
		if removeErr := os.Remove(payload.SourcePath); removeErr != nil {
			log.WithError(removeErr).Warn("Failed to delete source file after conversion failure")
		}
		return fmt.Errorf("image conversion failed: %w", err)
	}

	elapsed := time.Since(start)

	log.WithFields(logrus.Fields{
		"elapsed_ms":    elapsed.Milliseconds(),
		"original_size": result.OriginalSize,
		"output_size":   result.OutputSize,
		"output_width":  result.Width,
		"output_height": result.Height,
		"compression":   fmt.Sprintf("%.1f%%", float64(result.OutputSize)/float64(result.OriginalSize)*100),
	}).Info("Image conversion completed")

	if err := h.updateUploadStatusWithResult(ctx, payload.UploadID, result); err != nil {
		log.WithError(err).Warn("Failed to update status to completed")
	}

	if err := os.Remove(payload.SourcePath); err != nil {
		log.WithError(err).Warn("Failed to delete source file")
	} else {
		log.Debug("Deleted source file")
	}

	resultData := fmt.Sprintf(`{"path":"%s","size":%d,"width":%d,"height":%d}`,
		result.OutputPath, result.OutputSize, result.Width, result.Height)
	if _, err := t.ResultWriter().Write([]byte(resultData)); err != nil {
		log.WithError(err).Warn("Failed to write task result")
	}

	return nil
}

func (h *ImageHandler) handleImageThumbnail(ctx context.Context, t *asynq.Task) error {
	payload, err := tasks.ParseImageThumbnailPayload(t)
	if err != nil {
		return fmt.Errorf("failed to parse payload: %w: %w", err, asynq.SkipRetry)
	}

	log := h.logger.WithFields(logrus.Fields{
		"upload_id": payload.UploadID,
		"source":    payload.SourcePath,
		"target":    payload.TargetPath,
		"width":     payload.Width,
		"height":    payload.Height,
	})

	log.Info("Starting thumbnail generation")

	result, err := h.processor.Convert(payload.SourcePath, payload.TargetPath, processor.ConvertOptions{
		Quality:   payload.Quality,
		Format:    processor.FormatWebP,
		MaxWidth:  payload.Width,
		MaxHeight: payload.Height,
	})
	if err != nil {
		return fmt.Errorf("thumbnail generation failed: %w", err)
	}

	log.WithFields(logrus.Fields{
		"output_size":   result.OutputSize,
		"output_width":  result.Width,
		"output_height": result.Height,
	}).Info("Thumbnail generation completed")

	return nil
}

func (h *ImageHandler) updateUploadStatus(ctx context.Context, uploadID, status, errMsg string) error {
	key := fmt.Sprintf("upload:%s", uploadID)

	fields := map[string]any{
		"status":     status,
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	}

	if errMsg != "" {
		fields["error"] = errMsg
	}

	return h.redis.HSet(ctx, key, fields).Err()
}

func (h *ImageHandler) updateUploadStatusWithResult(ctx context.Context, uploadID string, result *processor.ConvertResult) error {
	key := fmt.Sprintf("upload:%s", uploadID)

	fields := map[string]any{
		"status":        "completed",
		"updated_at":    time.Now().UTC().Format(time.RFC3339),
		"output_path":   result.OutputPath,
		"output_size":   result.OutputSize,
		"output_width":  result.Width,
		"output_height": result.Height,
		"output_format": result.Format,
	}

	return h.redis.HSet(ctx, key, fields).Err()
}
