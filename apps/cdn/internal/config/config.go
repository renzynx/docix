package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port       string
	UploadDir  string
	HMACSecret string
	URLTTLSecs int64 // Default TTL for signed URLs in seconds
	BaseURL    string
}

func Load() *Config {
	port := os.Getenv("CDN_PORT")
	if port == "" {
		port = "8081"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	hmacSecret := os.Getenv("HMAC_SECRET")
	if hmacSecret == "" {
		// In production, this should be set and match the main server
		hmacSecret = "change-me-in-production"
	}

	urlTTLSecs := int64(24 * 60 * 60) // 24 hours default
	if ttl := os.Getenv("URL_TTL_SECS"); ttl != "" {
		if parsed, err := strconv.ParseInt(ttl, 10, 64); err == nil {
			urlTTLSecs = parsed
		}
	}

	baseURL := os.Getenv("CDN_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:" + port
	}

	return &Config{
		Port:       port,
		UploadDir:  uploadDir,
		HMACSecret: hmacSecret,
		URLTTLSecs: urlTTLSecs,
		BaseURL:    baseURL,
	}
}

// DefaultExpiration returns the default expiration time for new signed URLs
func (c *Config) DefaultExpiration() time.Time {
	return time.Now().Add(time.Duration(c.URLTTLSecs) * time.Second)
}
