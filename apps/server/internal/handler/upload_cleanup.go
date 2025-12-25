package handler

import (
	"net/http"

	"github.com/renzynx/docix/server/internal/queue"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
)

func (h *UploadHandler) CleanOrphanedFiles(w http.ResponseWriter, r *http.Request) {
	log.Info("Enqueueing orphan cleanup task")

	taskInfo, err := queue.EnqueueCleanupOrphans()
	if err != nil {
		log.Error("Failed to enqueue cleanup task: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to enqueue cleanup task")
		return
	}

	log.WithField("task_id", taskInfo.ID).Info("Cleanup task enqueued")

	response.JSON(w, http.StatusAccepted, map[string]any{
		"message": "Cleanup task enqueued",
		"task_id": taskInfo.ID,
		"queue":   taskInfo.Queue,
	})
}
