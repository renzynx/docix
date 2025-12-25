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

// ContentSettingsProvider defines the interface for content settings access
type ContentSettingsProvider interface {
	GetMaxUploadSizeMB(ctx context.Context) int
	GetAllowedImageTypes(ctx context.Context) string
}

type UploadHandler struct {
	db       *database.Database
	config   *config.Config
	settings ContentSettingsProvider
}

func NewUploadHandler(db *database.Database, cfg *config.Config, settings ContentSettingsProvider) *UploadHandler {
	if err := os.MkdirAll(cfg.Upload.Directory, 0755); err != nil {
		panic(fmt.Sprintf("failed to create upload directory: %v", err))
	}
	if err := os.MkdirAll(cfg.Upload.PendingDirectory, 0755); err != nil {
		panic(fmt.Sprintf("failed to create pending upload directory: %v", err))
	}

	return &UploadHandler{
		db:       db,
		config:   cfg,
		settings: settings,
	}
}

// getMaxFileSize returns the max file size in bytes from settings (with config fallback)
func (h *UploadHandler) getMaxFileSize(ctx context.Context) int64 {
	if h.settings != nil {
		sizeMB := h.settings.GetMaxUploadSizeMB(ctx)
		if sizeMB > 0 {
			return int64(sizeMB) * 1024 * 1024
		}
	}
	return h.config.Upload.MaxFileSize
}

// isAllowedFormat checks if the detected format is in the allowed list from settings
func (h *UploadHandler) isAllowedFormat(ctx context.Context, format string) bool {
	if h.settings == nil {
		// If no settings, allow all detected formats
		return format != ""
	}

	allowedTypes := h.settings.GetAllowedImageTypes(ctx)
	if allowedTypes == "" {
		return format != ""
	}

	// Normalize format names for comparison
	formatAliases := map[string][]string{
		"jpeg": {"jpg", "jpeg"},
		"png":  {"png"},
		"gif":  {"gif"},
		"webp": {"webp"},
		"bmp":  {"bmp"},
		"tiff": {"tiff", "tif"},
	}

	allowed := strings.Split(strings.ToLower(allowedTypes), ",")
	for _, a := range allowed {
		a = strings.TrimSpace(a)
		if aliases, ok := formatAliases[format]; ok {
			for _, alias := range aliases {
				if a == alias {
					return true
				}
			}
		}
		if a == format {
			return true
		}
	}
	return false
}

func detectImageFormat(header []byte) string {
	if len(header) < 12 {
		return ""
	}

	if header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF {
		return "jpeg"
	}

	if header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 {
		return "png"
	}

	if header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 {
		return "gif"
	}

	if string(header[0:4]) == "RIFF" && string(header[8:12]) == "WEBP" {
		return "webp"
	}

	if header[0] == 0x42 && header[1] == 0x4D {
		return "bmp"
	}

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

func (h *UploadHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	maxSize := h.getMaxFileSize(r.Context())
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	if err := r.ParseMultipartForm(maxSize); err != nil {
		response.Error(w, http.StatusBadRequest, "File too large or invalid form data")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

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

	// Check if format is allowed by settings
	if !h.isAllowedFormat(r.Context(), format) {
		response.Error(w, http.StatusBadRequest, fmt.Sprintf("Image format '%s' is not allowed", format))
		return
	}

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

func (h *UploadHandler) UploadMultipleFiles(w http.ResponseWriter, r *http.Request) {
	maxSize := h.getMaxFileSize(r.Context())
	r.Body = http.MaxBytesReader(w, r.Body, maxSize*100)

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

		// Check if format is allowed by settings
		if !h.isAllowedFormat(r.Context(), format) {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		uploadID := uuid.New().String()
		var status string

		if format == "webp" {
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
			responseID = uploadID + ".webp"
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

func (h *UploadHandler) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
	uploadID := chi.URLParam(r, "id")
	if uploadID == "" {
		response.Error(w, http.StatusBadRequest, "Upload ID required")
		return
	}

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
