package handler

import (
	"net/http"

	"github.com/renzynx/docix/server/internal/response"
	"github.com/sirupsen/logrus"
)

type TaskHandler struct {
	log *logrus.Entry
}

func NewTaskHandler(logger *logrus.Logger) *TaskHandler {
	return &TaskHandler{
		log: logger.WithField("handler", "tasks"),
	}
}

func (h *TaskHandler) GetTaskStats(w http.ResponseWriter, r *http.Request) {
	h.log.Info("Task stats endpoint requested")
	response.JSON(w, http.StatusOK, map[string]any{
		"message": "Task management endpoints available",
		"endpoints": map[string]string{
			"GET    /admin/tasks":          "List all tasks (requires asynq Inspector implementation)",
			"GET    /admin/tasks/queues":   "List all queues (requires asynq Inspector implementation)",
			"DELETE /admin/upload/cleanup": "Enqueue orphan cleanup task",
		},
	})
}
