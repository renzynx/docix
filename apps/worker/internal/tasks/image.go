package tasks

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

// ImageConvertPayload is the payload for image conversion tasks
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

// ImageThumbnailPayload is the payload for thumbnail generation tasks
type ImageThumbnailPayload struct {
	UploadID   string `json:"upload_id"`
	SourcePath string `json:"source_path"`
	TargetPath string `json:"target_path"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Quality    int    `json:"quality"`
}

// NewImageConvertTask creates a new image conversion task
func NewImageConvertTask(payload ImageConvertPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeImageConvert, data), nil
}

// NewImageThumbnailTask creates a new thumbnail generation task
func NewImageThumbnailTask(payload ImageThumbnailPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeImageThumbnail, data), nil
}

// ParseImageConvertPayload parses the payload from a task
func ParseImageConvertPayload(task *asynq.Task) (*ImageConvertPayload, error) {
	var payload ImageConvertPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}

// ParseImageThumbnailPayload parses the payload from a task
func ParseImageThumbnailPayload(task *asynq.Task) (*ImageThumbnailPayload, error) {
	var payload ImageThumbnailPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}
