package models

import "time"

type TaskState string

const (
	TaskStatePending   TaskState = "pending"
	TaskStateActive    TaskState = "active"
	TaskStateScheduled TaskState = "scheduled"
	TaskStateRetry     TaskState = "retry"
	TaskStateArchived  TaskState = "archived"
	TaskStateCompleted TaskState = "completed"
)

type QueueInfo struct {
	Name        string        `json:"name"`
	Paused      bool          `json:"paused"`
	Pending     int           `json:"pending"`
	Active      int           `json:"active"`
	Scheduled   int           `json:"scheduled"`
	Retry       int           `json:"retry"`
	Archived    int           `json:"archived"`
	Completed   int           `json:"completed"`
	Processed   int           `json:"processed"`
	Failed      int           `json:"failed"`
	MemoryUsage int64         `json:"memory_usage"`
	Latency     time.Duration `json:"latency"`
}

type TaskInfo struct {
	ID            string    `json:"id"`
	Queue         string    `json:"queue"`
	Type          string    `json:"type"`
	Payload       string    `json:"payload"`
	State         TaskState `json:"state"`
	MaxRetry      int       `json:"max_retry"`
	Retried       int       `json:"retried"`
	LastError     string    `json:"last_error,omitempty"`
	NextProcessAt time.Time `json:"next_process_at,omitempty"`
	Timeout       int64     `json:"timeout"`
	Deadline      time.Time `json:"deadline,omitempty"`
	CompletedAt   time.Time `json:"completed_at,omitempty"`
	Result        string    `json:"result,omitempty"`
}

type TaskListRequest struct {
	Queue    string    `json:"queue"`
	State    TaskState `json:"state"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
}

type TaskListResponse struct {
	Tasks      []TaskInfo `json:"tasks"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

type QueueListResponse struct {
	Queues []QueueInfo `json:"queues"`
}

type TaskActionRequest struct {
	Queue  string `json:"queue"`
	TaskID string `json:"task_id"`
}

type DailyStats struct {
	Date      string `json:"date"`
	Processed int    `json:"processed"`
	Failed    int    `json:"failed"`
}

type ServerInfo struct {
	Host          string         `json:"host"`
	PID           int            `json:"pid"`
	Concurrency   int            `json:"concurrency"`
	Queues        map[string]int `json:"queues"`
	Started       time.Time      `json:"started"`
	Status        string         `json:"status"`
	ActiveWorkers []WorkerInfo   `json:"active_workers"`
}

type WorkerInfo struct {
	TaskID    string    `json:"task_id"`
	Queue     string    `json:"queue"`
	TaskType  string    `json:"task_type"`
	StartedAt time.Time `json:"started_at"`
}

type TaskStatsResponse struct {
	Queues  []QueueInfo  `json:"queues"`
	Servers []ServerInfo `json:"servers"`
}
