package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/tasks"
	"github.com/sirupsen/logrus"
)

type TaskHandler struct {
	inspector *tasks.Inspector
	log       *logrus.Entry
}

func NewTaskHandler(inspector *tasks.Inspector, logger *logrus.Logger) *TaskHandler {
	return &TaskHandler{
		inspector: inspector,
		log:       logger.WithField("handler", "tasks"),
	}
}

func (h *TaskHandler) ListQueues(w http.ResponseWriter, r *http.Request) {
	queues, err := h.inspector.ListQueues()
	if err != nil {
		h.log.WithError(err).Error("Failed to list queues")
		response.Error(w, http.StatusInternalServerError, "Failed to list queues")
		return
	}

	response.JSON(w, http.StatusOK, models.QueueListResponse{Queues: queues})
}

func (h *TaskHandler) GetQueueInfo(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	info, err := h.inspector.GetQueueInfo(name)
	if err != nil {
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to get queue info")
		response.Error(w, http.StatusInternalServerError, "Failed to get queue info")
		return
	}

	response.JSON(w, http.StatusOK, info)
}

func (h *TaskHandler) ListTasks(w http.ResponseWriter, r *http.Request) {
	queue := chi.URLParam(r, "name")
	if queue == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	state := models.TaskState(r.URL.Query().Get("state"))
	if state == "" {
		state = models.TaskStatePending
	}

	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	pageSize := 20
	if sizeStr := r.URL.Query().Get("page_size"); sizeStr != "" {
		if s, err := strconv.Atoi(sizeStr); err == nil && s > 0 && s <= 100 {
			pageSize = s
		}
	}

	result, err := h.inspector.ListTasks(queue, state, page, pageSize)
	if err != nil {
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to list tasks")
		response.Error(w, http.StatusInternalServerError, "Failed to list tasks")
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *TaskHandler) GetTask(w http.ResponseWriter, r *http.Request) {
	queue := chi.URLParam(r, "queue")
	taskID := chi.URLParam(r, "id")

	if queue == "" || taskID == "" {
		response.Error(w, http.StatusBadRequest, "Queue name and task ID are required")
		return
	}

	task, err := h.inspector.GetTask(queue, taskID)
	if err != nil {
		if errors.Is(err, tasks.ErrTaskNotFound) {
			response.Error(w, http.StatusNotFound, "Task not found")
			return
		}
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to get task")
		response.Error(w, http.StatusInternalServerError, "Failed to get task")
		return
	}

	response.JSON(w, http.StatusOK, task)
}

func (h *TaskHandler) RunTask(w http.ResponseWriter, r *http.Request) {
	queue := chi.URLParam(r, "queue")
	taskID := chi.URLParam(r, "id")

	if queue == "" || taskID == "" {
		response.Error(w, http.StatusBadRequest, "Queue name and task ID are required")
		return
	}

	err := h.inspector.RunTask(queue, taskID)
	if err != nil {
		if errors.Is(err, tasks.ErrTaskNotFound) {
			response.Error(w, http.StatusNotFound, "Task not found")
			return
		}
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to run task")
		response.Error(w, http.StatusInternalServerError, "Failed to run task")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Task moved to pending queue"})
}

func (h *TaskHandler) ArchiveTask(w http.ResponseWriter, r *http.Request) {
	queue := chi.URLParam(r, "queue")
	taskID := chi.URLParam(r, "id")

	if queue == "" || taskID == "" {
		response.Error(w, http.StatusBadRequest, "Queue name and task ID are required")
		return
	}

	err := h.inspector.ArchiveTask(queue, taskID)
	if err != nil {
		if errors.Is(err, tasks.ErrTaskNotFound) {
			response.Error(w, http.StatusNotFound, "Task not found")
			return
		}
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to archive task")
		response.Error(w, http.StatusInternalServerError, "Failed to archive task")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Task archived"})
}

func (h *TaskHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	queue := chi.URLParam(r, "queue")
	taskID := chi.URLParam(r, "id")

	if queue == "" || taskID == "" {
		response.Error(w, http.StatusBadRequest, "Queue name and task ID are required")
		return
	}

	err := h.inspector.DeleteTask(queue, taskID)
	if err != nil {
		if errors.Is(err, tasks.ErrTaskNotFound) {
			response.Error(w, http.StatusNotFound, "Task not found")
			return
		}
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to delete task")
		response.Error(w, http.StatusInternalServerError, "Failed to delete task")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Task deleted"})
}

func (h *TaskHandler) PauseQueue(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	err := h.inspector.PauseQueue(name)
	if err != nil {
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to pause queue")
		response.Error(w, http.StatusInternalServerError, "Failed to pause queue")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Queue paused"})
}

func (h *TaskHandler) UnpauseQueue(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	err := h.inspector.UnpauseQueue(name)
	if err != nil {
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to unpause queue")
		response.Error(w, http.StatusInternalServerError, "Failed to unpause queue")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Queue unpaused"})
}

func (h *TaskHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	days := 7
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 90 {
			days = d
		}
	}

	stats, err := h.inspector.GetHistory(name, days)
	if err != nil {
		if errors.Is(err, tasks.ErrQueueNotFound) {
			response.Error(w, http.StatusNotFound, "Queue not found")
			return
		}
		h.log.WithError(err).Error("Failed to get queue history")
		response.Error(w, http.StatusInternalServerError, "Failed to get queue history")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"history": stats})
}

func (h *TaskHandler) ListServers(w http.ResponseWriter, r *http.Request) {
	servers, err := h.inspector.ListServers()
	if err != nil {
		h.log.WithError(err).Error("Failed to list servers")
		response.Error(w, http.StatusInternalServerError, "Failed to list servers")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"servers": servers})
}

func (h *TaskHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	queues, err := h.inspector.ListQueues()
	if err != nil {
		h.log.WithError(err).Error("Failed to list queues")
		response.Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	servers, err := h.inspector.ListServers()
	if err != nil {
		h.log.WithError(err).Error("Failed to list servers")
		response.Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	response.JSON(w, http.StatusOK, models.TaskStatsResponse{
		Queues:  queues,
		Servers: servers,
	})
}

func (h *TaskHandler) RunAllScheduledTasks(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	count, err := h.inspector.RunAllScheduledTasks(name)
	if err != nil {
		h.log.WithError(err).Error("Failed to run all scheduled tasks")
		response.Error(w, http.StatusInternalServerError, "Failed to run all scheduled tasks")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"message": "Scheduled tasks moved to pending", "count": count})
}

func (h *TaskHandler) RunAllRetryTasks(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	count, err := h.inspector.RunAllRetryTasks(name)
	if err != nil {
		h.log.WithError(err).Error("Failed to run all retry tasks")
		response.Error(w, http.StatusInternalServerError, "Failed to run all retry tasks")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"message": "Retry tasks moved to pending", "count": count})
}

func (h *TaskHandler) DeleteAllArchivedTasks(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		response.Error(w, http.StatusBadRequest, "Queue name is required")
		return
	}

	count, err := h.inspector.DeleteAllArchivedTasks(name)
	if err != nil {
		h.log.WithError(err).Error("Failed to delete all archived tasks")
		response.Error(w, http.StatusInternalServerError, "Failed to delete all archived tasks")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{"message": "Archived tasks deleted", "count": count})
}
