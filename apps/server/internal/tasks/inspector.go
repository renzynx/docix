package tasks

import (
	"errors"
	"sync"

	"github.com/hibiken/asynq"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/models"
)

var (
	ErrQueueNotFound = errors.New("queue not found")
	ErrTaskNotFound  = errors.New("task not found")
)

type Inspector struct {
	inspector *asynq.Inspector
}

var (
	instance     *Inspector
	instanceOnce sync.Once
)

func GetInspector() (*Inspector, error) {
	var initErr error

	instanceOnce.Do(func() {
		cfg := redis.LoadConfig()

		redisOpt := asynq.RedisClientOpt{
			Addr:     cfg.Addr,
			Password: cfg.Password,
			DB:       cfg.DB,
		}

		instance = &Inspector{
			inspector: asynq.NewInspector(redisOpt),
		}
	})

	return instance, initErr
}

func (i *Inspector) Close() error {
	return i.inspector.Close()
}

func (i *Inspector) ListQueues() ([]models.QueueInfo, error) {
	queues, err := i.inspector.Queues()
	if err != nil {
		return nil, err
	}

	result := make([]models.QueueInfo, 0, len(queues))
	for _, queueName := range queues {
		qinfo, err := i.inspector.GetQueueInfo(queueName)
		if err != nil {
			continue
		}
		result = append(result, mapQueueInfo(qinfo))
	}

	return result, nil
}

func (i *Inspector) GetQueueInfo(name string) (*models.QueueInfo, error) {
	qinfo, err := i.inspector.GetQueueInfo(name)
	if err != nil {
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return nil, ErrQueueNotFound
		}
		return nil, err
	}

	info := mapQueueInfo(qinfo)
	return &info, nil
}

func (i *Inspector) ListTasks(queue string, state models.TaskState, page, pageSize int) (*models.TaskListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	opts := []asynq.ListOption{
		asynq.PageSize(pageSize),
		asynq.Page(page),
	}

	var tasks []*asynq.TaskInfo
	var err error
	var totalCount int

	qinfo, qerr := i.inspector.GetQueueInfo(queue)
	if qerr != nil {
		if errors.Is(qerr, asynq.ErrQueueNotFound) {
			return nil, ErrQueueNotFound
		}
		return nil, qerr
	}

	switch state {
	case models.TaskStatePending:
		tasks, err = i.inspector.ListPendingTasks(queue, opts...)
		totalCount = qinfo.Pending
	case models.TaskStateActive:
		tasks, err = i.inspector.ListActiveTasks(queue, opts...)
		totalCount = qinfo.Active
	case models.TaskStateScheduled:
		tasks, err = i.inspector.ListScheduledTasks(queue, opts...)
		totalCount = qinfo.Scheduled
	case models.TaskStateRetry:
		tasks, err = i.inspector.ListRetryTasks(queue, opts...)
		totalCount = qinfo.Retry
	case models.TaskStateArchived:
		tasks, err = i.inspector.ListArchivedTasks(queue, opts...)
		totalCount = qinfo.Archived
	case models.TaskStateCompleted:
		tasks, err = i.inspector.ListCompletedTasks(queue, opts...)
		totalCount = qinfo.Completed
	default:
		tasks, err = i.inspector.ListPendingTasks(queue, opts...)
		totalCount = qinfo.Pending
	}

	if err != nil {
		return nil, err
	}

	result := make([]models.TaskInfo, 0, len(tasks))
	for _, t := range tasks {
		result = append(result, mapTaskInfo(t))
	}

	return &models.TaskListResponse{
		Tasks:      result,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (i *Inspector) GetTask(queue, taskID string) (*models.TaskInfo, error) {
	t, err := i.inspector.GetTaskInfo(queue, taskID)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskNotFound) {
			return nil, ErrTaskNotFound
		}
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return nil, ErrQueueNotFound
		}
		return nil, err
	}

	info := mapTaskInfo(t)
	return &info, nil
}

func (i *Inspector) RunTask(queue, taskID string) error {
	err := i.inspector.RunTask(queue, taskID)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskNotFound) {
			return ErrTaskNotFound
		}
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return ErrQueueNotFound
		}
	}
	return err
}

func (i *Inspector) ArchiveTask(queue, taskID string) error {
	err := i.inspector.ArchiveTask(queue, taskID)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskNotFound) {
			return ErrTaskNotFound
		}
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return ErrQueueNotFound
		}
	}
	return err
}

func (i *Inspector) DeleteTask(queue, taskID string) error {
	err := i.inspector.DeleteTask(queue, taskID)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskNotFound) {
			return ErrTaskNotFound
		}
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return ErrQueueNotFound
		}
	}
	return err
}

func (i *Inspector) PauseQueue(name string) error {
	err := i.inspector.PauseQueue(name)
	if err != nil {
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return ErrQueueNotFound
		}
	}
	return err
}

func (i *Inspector) UnpauseQueue(name string) error {
	err := i.inspector.UnpauseQueue(name)
	if err != nil {
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return ErrQueueNotFound
		}
	}
	return err
}

func (i *Inspector) GetHistory(queue string, days int) ([]models.DailyStats, error) {
	if days < 1 {
		days = 7
	}
	if days > 90 {
		days = 90
	}

	stats, err := i.inspector.History(queue, days)
	if err != nil {
		if errors.Is(err, asynq.ErrQueueNotFound) {
			return nil, ErrQueueNotFound
		}
		return nil, err
	}

	result := make([]models.DailyStats, 0, len(stats))
	for _, s := range stats {
		result = append(result, models.DailyStats{
			Date:      s.Date.Format("2006-01-02"),
			Processed: s.Processed,
			Failed:    s.Failed,
		})
	}

	return result, nil
}

func (i *Inspector) ListServers() ([]models.ServerInfo, error) {
	servers, err := i.inspector.Servers()
	if err != nil {
		return nil, err
	}

	result := make([]models.ServerInfo, 0, len(servers))
	for _, s := range servers {
		workers := make([]models.WorkerInfo, 0, len(s.ActiveWorkers))
		for _, w := range s.ActiveWorkers {
			workers = append(workers, models.WorkerInfo{
				TaskID:    w.TaskID,
				Queue:     w.Queue,
				TaskType:  w.TaskType,
				StartedAt: w.Started,
			})
		}

		result = append(result, models.ServerInfo{
			Host:          s.Host,
			PID:           s.PID,
			Concurrency:   s.Concurrency,
			Queues:        s.Queues,
			Started:       s.Started,
			Status:        s.Status,
			ActiveWorkers: workers,
		})
	}

	return result, nil
}

func (i *Inspector) RunAllScheduledTasks(queue string) (int, error) {
	return i.inspector.RunAllScheduledTasks(queue)
}

func (i *Inspector) RunAllRetryTasks(queue string) (int, error) {
	return i.inspector.RunAllRetryTasks(queue)
}

func (i *Inspector) ArchiveAllPendingTasks(queue string) (int, error) {
	return i.inspector.ArchiveAllPendingTasks(queue)
}

func (i *Inspector) DeleteAllArchivedTasks(queue string) (int, error) {
	return i.inspector.DeleteAllArchivedTasks(queue)
}

func (i *Inspector) DeleteAllCompletedTasks(queue string) (int, error) {
	return i.inspector.DeleteAllCompletedTasks(queue)
}

func mapQueueInfo(q *asynq.QueueInfo) models.QueueInfo {
	return models.QueueInfo{
		Name:        q.Queue,
		Paused:      q.Paused,
		Pending:     q.Pending,
		Active:      q.Active,
		Scheduled:   q.Scheduled,
		Retry:       q.Retry,
		Archived:    q.Archived,
		Completed:   q.Completed,
		Processed:   q.Processed,
		Failed:      q.Failed,
		MemoryUsage: q.MemoryUsage,
		Latency:     q.Latency,
	}
}

func mapTaskInfo(t *asynq.TaskInfo) models.TaskInfo {
	return models.TaskInfo{
		ID:            t.ID,
		Queue:         t.Queue,
		Type:          t.Type,
		Payload:       string(t.Payload),
		State:         mapTaskState(t.State),
		MaxRetry:      t.MaxRetry,
		Retried:       t.Retried,
		LastError:     t.LastErr,
		NextProcessAt: t.NextProcessAt,
		Timeout:       int64(t.Timeout.Seconds()),
		Deadline:      t.Deadline,
		CompletedAt:   t.CompletedAt,
		Result:        string(t.Result),
	}
}

func mapTaskState(s asynq.TaskState) models.TaskState {
	switch s {
	case asynq.TaskStatePending:
		return models.TaskStatePending
	case asynq.TaskStateActive:
		return models.TaskStateActive
	case asynq.TaskStateScheduled:
		return models.TaskStateScheduled
	case asynq.TaskStateRetry:
		return models.TaskStateRetry
	case asynq.TaskStateArchived:
		return models.TaskStateArchived
	case asynq.TaskStateCompleted:
		return models.TaskStateCompleted
	default:
		return models.TaskStatePending
	}
}
