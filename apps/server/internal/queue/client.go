package queue

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/hibiken/asynq"
	"github.com/renzynx/docix/packages/go/redis"
)

// Task type constants (must match worker)
const (
	TypeImageConvert   = "image:convert"
	TypeImageThumbnail = "image:thumbnail"
)

// Queue names
const (
	QueueCritical = "critical"
	QueueDefault  = "default"
	QueueLow      = "low"
)

// ImageConvertPayload matches the worker's expected payload
type ImageConvertPayload struct {
	UploadID         string `json:"upload_id"`
	SourcePath       string `json:"source_path"`
	TargetPath       string `json:"target_path"`
	OriginalFilename string `json:"original_filename"`
	TargetFormat     string `json:"target_format"`
	Quality          int    `json:"quality"`
	MaxWidth         int    `json:"max_width,omitempty"`
	MaxHeight        int    `json:"max_height,omitempty"`
}

var (
	client     *asynq.Client
	clientOnce sync.Once
	clientErr  error
)

// GetClient returns the singleton asynq client
func GetClient() (*asynq.Client, error) {
	clientOnce.Do(func() {
		cfg := redis.LoadConfig()
		
		redisOpt := asynq.RedisClientOpt{
			Addr:     cfg.Addr,
			Password: cfg.Password,
			DB:       cfg.DB,
		}
		
		client = asynq.NewClient(redisOpt)
	})
	
	return client, clientErr
}

// Close closes the asynq client
func Close() error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// EnqueueImageConvert enqueues an image conversion task
func EnqueueImageConvert(payload ImageConvertPayload) (*asynq.TaskInfo, error) {
	c, err := GetClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get queue client: %w", err)
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeImageConvert, data)
	
	return c.Enqueue(
		task,
		asynq.Queue(QueueDefault),
		asynq.MaxRetry(3),
		asynq.Timeout(5*time.Minute),
	)
}

// EnqueueImageConvertCritical enqueues an image conversion task with high priority
func EnqueueImageConvertCritical(payload ImageConvertPayload) (*asynq.TaskInfo, error) {
	c, err := GetClient()
	if err != nil {
		return nil, fmt.Errorf("failed to get queue client: %w", err)
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(TypeImageConvert, data)
	
	return c.Enqueue(
		task,
		asynq.Queue(QueueCritical),
		asynq.MaxRetry(5),
		asynq.Timeout(5*time.Minute),
	)
}
