package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
)

type UploadHandler struct {
	db     *database.Database
	config *config.Config
}

func NewUploadHandler(db *database.Database, cfg *config.Config) *UploadHandler {
	// Ensure upload directory exists
	if err := os.MkdirAll(cfg.Upload.Directory, 0755); err != nil {
		panic(fmt.Sprintf("failed to create upload directory: %v", err))
	}

	return &UploadHandler{
		db:     db,
		config: cfg,
	}
}

func isWebP(data []byte) bool {
	if len(data) < 12 {
		return false
	}
	return string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP"
}

func (h *UploadHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	// Limit file size
	r.Body = http.MaxBytesReader(w, r.Body, h.config.Upload.MaxFileSize)

	if err := r.ParseMultipartForm(h.config.Upload.MaxFileSize); err != nil {
		response.Error(w, http.StatusBadRequest, "File too large or invalid form data")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

	// Read magic number (first 12 bytes)
	header := make([]byte, 12)
	if _, err := io.ReadFull(file, header); err != nil {
		response.Error(w, http.StatusBadRequest, "Failed to read file header")
		return
	}

	// Validate WebP format
	if !isWebP(header) {
		response.Error(w, http.StatusBadRequest, "Invalid file type. Only WebP images are accepted")
		return
	}

	// Generate unique filename with .webp extension
	filename := uuid.New().String() + ".webp"
	dstPath := filepath.Join(h.config.Upload.Directory, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create destination file")
		return
	}
	defer dst.Close()

	// Stream file to disk: Header + Remaining Content
	if _, err := io.Copy(dst, io.MultiReader(bytes.NewReader(header), file)); err != nil {
		// Clean up partial file
		os.Remove(dstPath)
		response.Error(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	response.JSON(w, http.StatusOK, models.UploadResponse{
		Filename: filename,
	})
}

func (h *UploadHandler) UploadMultipleFiles(w http.ResponseWriter, r *http.Request) {
	// Limit total request size (100 files * max file size)
	maxTotalSize := h.config.Upload.MaxFileSize * 100
	r.Body = http.MaxBytesReader(w, r.Body, maxTotalSize)

	// Parse multipart form with 32MB max memory
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Files too large or invalid form data")
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		response.Error(w, http.StatusBadRequest, "No files provided")
		return
	}

	var uploads []models.UploadResponse
	var failed []string

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			failed = append(failed, fileHeader.Filename)
			continue
		}

		// Read magic number (first 12 bytes)
		header := make([]byte, 12)
		if _, err := io.ReadFull(file, header); err != nil {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		// Validate WebP format
		if !isWebP(header) {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		// Generate unique filename with .webp extension
		filename := uuid.New().String() + ".webp"

		// Stream to disk
		dstPath := filepath.Join(h.config.Upload.Directory, filename)
		dst, err := os.Create(dstPath)
		if err != nil {
			file.Close()
			failed = append(failed, fileHeader.Filename)
			continue
		}

		// Use MultiReader to combine header + rest of file
		_, copyErr := io.Copy(dst, io.MultiReader(bytes.NewReader(header), file))
		dst.Close()
		file.Close()

		if copyErr != nil {
			os.Remove(dstPath)
			failed = append(failed, fileHeader.Filename)
			continue
		}

		uploads = append(uploads, models.UploadResponse{
			Filename: filename,
		})
	}

	if len(uploads) == 0 && len(failed) > 0 {
		response.Error(w, http.StatusBadRequest, "All file uploads failed")
		return
	}

	response.JSON(w, http.StatusOK, models.BulkUploadResponse{
		Uploads: uploads,
		Failed:  failed,
	})
}
