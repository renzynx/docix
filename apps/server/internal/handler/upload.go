package handler

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/queue"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
)

type UploadHandler struct {
	db     *database.Database
	config *config.Config
}

func NewUploadHandler(db *database.Database, cfg *config.Config) *UploadHandler {
	// Ensure upload directories exist
	if err := os.MkdirAll(cfg.Upload.Directory, 0755); err != nil {
		panic(fmt.Sprintf("failed to create upload directory: %v", err))
	}
	if err := os.MkdirAll(cfg.Upload.PendingDirectory, 0755); err != nil {
		panic(fmt.Sprintf("failed to create pending upload directory: %v", err))
	}

	return &UploadHandler{
		db:     db,
		config: cfg,
	}
}

// detectImageFormat detects image format from magic bytes
func detectImageFormat(header []byte) string {
	if len(header) < 12 {
		return ""
	}

	// Check JPEG
	if header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF {
		return "jpeg"
	}

	// Check PNG
	if header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 {
		return "png"
	}

	// Check GIF
	if header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 {
		return "gif"
	}

	// Check WebP (RIFF....WEBP)
	if string(header[0:4]) == "RIFF" && string(header[8:12]) == "WEBP" {
		return "webp"
	}

	// Check BMP
	if header[0] == 0x42 && header[1] == 0x4D {
		return "bmp"
	}

	// Check TIFF
	if (header[0] == 0x49 && header[1] == 0x49) || (header[0] == 0x4D && header[1] == 0x4D) {
		return "tiff"
	}

	return ""
}

func getExtension(format string) string {
	switch format {
	case "jpeg":
		return ".jpg"
	case "png":
		return ".png"
	case "gif":
		return ".gif"
	case "webp":
		return ".webp"
	case "bmp":
		return ".bmp"
	case "tiff":
		return ".tiff"
	default:
		return ""
	}
}

// UploadFile handles file upload with async processing
func (h *UploadHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, h.config.Upload.MaxFileSize)

	if err := r.ParseMultipartForm(h.config.Upload.MaxFileSize); err != nil {
		response.Error(w, http.StatusBadRequest, "File too large or invalid form data")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

	// Read magic bytes
	header := make([]byte, 12)
	if _, err := io.ReadFull(file, header); err != nil {
		response.Error(w, http.StatusBadRequest, "Failed to read file header")
		return
	}

	format := detectImageFormat(header)
	if format == "" {
		response.Error(w, http.StatusBadRequest, "Unsupported image format")
		return
	}

	// If already WebP, save directly
	if format == "webp" {
		filename := uuid.New().String() + ".webp"
		dstPath := filepath.Join(h.config.Upload.Directory, filename)

		dst, err := os.Create(dstPath)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to create file")
			return
		}
		defer dst.Close()

		if _, err := dst.Write(header); err != nil {
			os.Remove(dstPath)
			response.Error(w, http.StatusInternalServerError, "Failed to save file")
			return
		}
		if _, err := io.Copy(dst, file); err != nil {
			os.Remove(dstPath)
			response.Error(w, http.StatusInternalServerError, "Failed to save file")
			return
		}

		response.JSON(w, http.StatusOK, models.AsyncUploadResponse{
			UploadID: filename,
			Status:   "completed",
		})
		return
	}

	// Save to pending and enqueue for conversion
	uploadID := uuid.New().String()
	sourcePath := filepath.Join(h.config.Upload.PendingDirectory, uploadID+getExtension(format))
	targetPath := filepath.Join(h.config.Upload.Directory, uploadID+".webp")

	dst, err := os.Create(sourcePath)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create file")
		return
	}

	if _, err := dst.Write(header); err != nil {
		dst.Close()
		os.Remove(sourcePath)
		response.Error(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(sourcePath)
		response.Error(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	dst.Close()

	// Set status and enqueue
	h.setUploadStatus(uploadID, "pending", fileHeader.Filename)

	_, err = queue.EnqueueImageConvert(queue.ImageConvertPayload{
		UploadID:         uploadID,
		SourcePath:       sourcePath,
		TargetPath:       targetPath,
		OriginalFilename: fileHeader.Filename,
		TargetFormat:     "webp",
		Quality:          h.config.Upload.WebPQuality,
	})
	if err != nil {
		os.Remove(sourcePath)
		log.WithError(err).Error("Failed to enqueue conversion")
		response.Error(w, http.StatusInternalServerError, "Failed to queue processing")
		return
	}

	response.JSON(w, http.StatusAccepted, models.AsyncUploadResponse{
		UploadID: uploadID,
		Status:   "pending",
	})
}

// UploadMultipleFiles handles bulk upload with async processing
func (h *UploadHandler) UploadMultipleFiles(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, h.config.Upload.MaxFileSize*100)

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Files too large or invalid form data")
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		response.Error(w, http.StatusBadRequest, "No files provided")
		return
	}

	var uploads []models.AsyncUploadResponse
	var failed []string

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			failed = append(failed, fileHeader.Filename)
			continue
		}

		header := make([]byte, 12)
		if _, err := io.ReadFull(file, header); err != nil {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		format := detectImageFormat(header)
		if format == "" {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		uploadID := uuid.New().String()
		var status string

		if format == "webp" {
			// Save directly
			dstPath := filepath.Join(h.config.Upload.Directory, uploadID+".webp")
			dst, err := os.Create(dstPath)
			if err != nil {
				file.Close()
				failed = append(failed, fileHeader.Filename)
				continue
			}
			dst.Write(header)
			io.Copy(dst, file)
			dst.Close()
			file.Close()
			status = "completed"
		} else {
			// Save to pending and enqueue
			sourcePath := filepath.Join(h.config.Upload.PendingDirectory, uploadID+getExtension(format))
			targetPath := filepath.Join(h.config.Upload.Directory, uploadID+".webp")

			dst, err := os.Create(sourcePath)
			if err != nil {
				file.Close()
				failed = append(failed, fileHeader.Filename)
				continue
			}
			dst.Write(header)
			io.Copy(dst, file)
			dst.Close()
			file.Close()

			h.setUploadStatus(uploadID, "pending", fileHeader.Filename)

			_, err = queue.EnqueueImageConvert(queue.ImageConvertPayload{
				UploadID:         uploadID,
				SourcePath:       sourcePath,
				TargetPath:       targetPath,
				OriginalFilename: fileHeader.Filename,
				TargetFormat:     "webp",
				Quality:          h.config.Upload.WebPQuality,
			})
			if err != nil {
				os.Remove(sourcePath)
				failed = append(failed, fileHeader.Filename)
				continue
			}
			status = "pending"
		}

		responseID := uploadID
		if status == "completed" {
			responseID = uploadID + ".webp" // Return full filename for completed uploads
		}
		uploads = append(uploads, models.AsyncUploadResponse{
			UploadID: responseID,
			Status:   status,
		})
	}

	if len(uploads) == 0 && len(failed) > 0 {
		response.Error(w, http.StatusBadRequest, "All uploads failed")
		return
	}

	response.JSON(w, http.StatusAccepted, models.AsyncBulkUploadResponse{
		Uploads: uploads,
		Failed:  failed,
	})
}

// GetUploadStatus returns the status of an upload
func (h *UploadHandler) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
	uploadID := chi.URLParam(r, "id")
	if uploadID == "" {
		response.Error(w, http.StatusBadRequest, "Upload ID required")
		return
	}

	// Check if completed file exists
	if strings.HasSuffix(uploadID, ".webp") {
		if _, err := os.Stat(filepath.Join(h.config.Upload.Directory, uploadID)); err == nil {
			response.JSON(w, http.StatusOK, models.UploadStatusResponse{
				UploadID: uploadID,
				Status:   "completed",
				Filename: uploadID,
			})
			return
		}
	}

	// Check Redis
	redisClient, err := redis.GetClient()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Status store unavailable")
		return
	}

	result, err := redisClient.HGetAll(context.Background(), "upload:"+uploadID).Result()
	if err != nil || len(result) == 0 {
		response.Error(w, http.StatusNotFound, "Upload not found")
		return
	}

	resp := models.UploadStatusResponse{
		UploadID: uploadID,
		Status:   result["status"],
	}

	if result["status"] == "completed" {
		resp.Filename = uploadID + ".webp"
	}
	if errMsg := result["error"]; errMsg != "" {
		resp.Error = errMsg
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *UploadHandler) setUploadStatus(uploadID, status, originalFilename string) {
	redisClient, err := redis.GetClient()
	if err != nil {
		return
	}

	fields := map[string]any{
		"status":     status,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}
	if originalFilename != "" {
		fields["original_filename"] = originalFilename
	}

	ctx := context.Background()
	redisClient.HSet(ctx, "upload:"+uploadID, fields)
}
