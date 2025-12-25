package tasks

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

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

type ImageThumbnailPayload struct {
	UploadID   string `json:"upload_id"`
	SourcePath string `json:"source_path"`
	TargetPath string `json:"target_path"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Quality    int    `json:"quality"`
}

func NewImageConvertTask(payload ImageConvertPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeImageConvert, data), nil
}

func NewImageThumbnailTask(payload ImageThumbnailPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeImageThumbnail, data), nil
}

func ParseImageConvertPayload(task *asynq.Task) (*ImageConvertPayload, error) {
	var payload ImageConvertPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}

func ParseImageThumbnailPayload(task *asynq.Task) (*ImageThumbnailPayload, error) {
	var payload ImageThumbnailPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}
