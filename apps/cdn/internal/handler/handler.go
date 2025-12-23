package handler

import (
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docix/cdn/internal/config"
	"github.com/renzynx/docix/packages/go/signing"
)

type Handler struct {
	config *config.Config
	signer *signing.Signer
}

func New(cfg *config.Config) *Handler {
	return &Handler{
		config: cfg,
		signer: signing.NewVerifier(cfg.HMACSecret),
	}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok","service":"docix-cdn"}`))
}

func (h *Handler) ServeImage(w http.ResponseWriter, r *http.Request) {
	// Extract filename from path
	filename := filepath.Base(r.URL.Path)

	// Skip health endpoint
	if filename == "health" {
		h.Health(w, r)
		return
	}

	// Get signature parameters
	ex := r.URL.Query().Get("ex")
	hm := r.URL.Query().Get("hm")

	// Validate required parameters
	if ex == "" || hm == "" {
		http.Error(w, `{"error":"missing signature parameters"}`, http.StatusBadRequest)
		return
	}

	// Verify signature and expiration
	valid, err := h.signer.VerifyURL(filename, ex, hm)
	if !valid {
		log.Printf("Signature verification failed for %s: %v", filename, err)
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusForbidden)
		return
	}

	// Construct file path
	filePath := filepath.Join(h.config.UploadDir, filename)

	// Security: Ensure we're not escaping the upload directory
	absUploadDir, _ := filepath.Abs(h.config.UploadDir)
	absFilePath, _ := filepath.Abs(filePath)
	if !strings.HasPrefix(absFilePath, absUploadDir) {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	// Check if file exists
	stat, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		http.Error(w, `{"error":"file not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error stating file %s: %v", filePath, err)
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Error opening file %s: %v", filePath, err)
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Determine content type
	ext := filepath.Ext(filename)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Get expiration time for cache headers
	expiresAt, _ := signing.ExpirationTime(ex)

	// Set headers
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size()))
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable") // 1 year (URLs are signed, so they're unique)
	w.Header().Set("Expires", expiresAt.UTC().Format(http.TimeFormat))
	w.Header().Set("Last-Modified", stat.ModTime().UTC().Format(http.TimeFormat))
	w.Header().Set("ETag", fmt.Sprintf(`"%x-%x"`, stat.ModTime().Unix(), stat.Size()))
	w.Header().Set("X-Content-Type-Options", "nosniff")

	// CORS headers for browser access
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Max-Age", "86400")

	// Handle If-None-Match (ETag)
	if match := r.Header.Get("If-None-Match"); match != "" {
		if match == w.Header().Get("ETag") {
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	// Handle If-Modified-Since
	if ims := r.Header.Get("If-Modified-Since"); ims != "" {
		imsTime, err := time.Parse(http.TimeFormat, ims)
		if err == nil && !stat.ModTime().After(imsTime) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	// Serve file
	w.WriteHeader(http.StatusOK)
	io.Copy(w, file)
}

func (h *Handler) CORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type")
	w.Header().Set("Access-Control-Max-Age", "86400")
	w.WriteHeader(http.StatusNoContent)
}
