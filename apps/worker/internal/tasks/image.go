package tasks

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

// ImageConvertPayload is the payload for image conversion tasks
type ImageConvertPayload struct {
	// UploadID is the unique identifier for tracking this upload
	UploadID string `json:"upload_id"`

	// SourcePath is the path to the original uploaded file
	SourcePath string `json:"source_path"`

	// TargetPath is the path where the converted file should be saved
	TargetPath string `json:"target_path"`

	// OriginalFilename is the original name of the uploaded file
	OriginalFilename string `json:"original_filename"`

	// TargetFormat is the desired output format (webp, avif, etc.)
	TargetFormat string `json:"target_format"`

	// Quality is the output quality (1-100)
	Quality int `json:"quality"`

	// MaxWidth is the maximum width (0 = no resize)
	MaxWidth int `json:"max_width,omitempty"`

	// MaxHeight is the maximum height (0 = no resize)
	MaxHeight int `json:"max_height,omitempty"`
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
