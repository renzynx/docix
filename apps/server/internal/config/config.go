package config

import (
	"os"
	"slices"
	"strconv"
	"strings"

	_ "github.com/joho/godotenv/autoload"
)

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	UseTLS   bool
}

type UploadConfig struct {
	Directory        string
	PendingDirectory string
	MaxFileSize      int64
	BaseURL          string
	WebPQuality      int
}

type CDNConfig struct {
	BaseURL    string // CDN service URL (e.g., http://localhost:8081)
	HMACSecret string // Shared secret for signing URLs
	URLTTLSecs int64  // URL expiration time in seconds
}

type Config struct {
	Host            string
	Port            int
	TrustedOrigins  []string
	IsProduction    bool
	UseSecureCookie bool
	AuthSecret      string
	SMTP            SMTPConfig
	Upload          UploadConfig
	CDN             CDNConfig
}

var cfg *Config

func Load() *Config {
	if cfg != nil {
		return cfg
	}

	trustedOrigins := []string{}
	if origins := os.Getenv("TRUSTED_ORIGINS"); origins != "" {
		for origin := range strings.SplitSeq(origins, ",") {
			trustedOrigins = append(trustedOrigins, strings.TrimSpace(origin))
		}
	}

	// Check if any trusted origin uses HTTPS
	useSecureCookie := false
	for _, origin := range trustedOrigins {
		if strings.HasPrefix(origin, "https://") {
			useSecureCookie = true
			break
		}
	}

	authSecret := os.Getenv("AUTH_SECRET")
	if authSecret == "" {
		panic("AUTH_SECRET environment variable is required")
	}

	host := os.Getenv("HOST")
	if host == "" {
		host = "localhost"
	}

	port := 8000
	if portStr := os.Getenv("SERVER_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	cfg = &Config{
		Host:            host,
		Port:            port,
		TrustedOrigins:  trustedOrigins,
		IsProduction:    os.Getenv("GO_ENV") == "production",
		UseSecureCookie: useSecureCookie,
		AuthSecret:      authSecret,
		SMTP:            loadSMTPConfig(),
		Upload:          loadUploadConfig(),
		CDN:             loadCDNConfig(),
	}

	return cfg
}

func loadSMTPConfig() SMTPConfig {
	port := 587 // Default SMTP port
	if portStr := os.Getenv("SMTP_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	useTLS := false
	if tlsStr := os.Getenv("SMTP_USE_TLS"); tlsStr != "" {
		useTLS = tlsStr == "true" || tlsStr == "1"
	}

	return SMTPConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     port,
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
		UseTLS:   useTLS,
	}
}

func Get() *Config {
	if cfg == nil {
		return Load()
	}
	return cfg
}

func (c *Config) IsTrustedOrigin(origin string) bool {
	return slices.Contains(c.TrustedOrigins, origin)
}

func loadUploadConfig() UploadConfig {
	directory := os.Getenv("UPLOAD_DIR")
	if directory == "" {
		directory = "./uploads"
	}

	pendingDirectory := os.Getenv("PENDING_UPLOAD_DIR")
	if pendingDirectory == "" {
		pendingDirectory = directory + "/pending"
	}

	maxFileSize := int64(10 * 1024 * 1024) // 10MB default
	if sizeStr := os.Getenv("UPLOAD_MAX_SIZE"); sizeStr != "" {
		if size, err := strconv.ParseInt(sizeStr, 10, 64); err == nil {
			maxFileSize = size
		}
	}

	baseURL := os.Getenv("UPLOAD_BASE_URL")
	if baseURL == "" {
		baseURL = "/uploads"
	}

	webpQuality := 85
	if qualityStr := os.Getenv("WEBP_QUALITY"); qualityStr != "" {
		if quality, err := strconv.Atoi(qualityStr); err == nil && quality >= 1 && quality <= 100 {
			webpQuality = quality
		}
	}

	return UploadConfig{
		Directory:        directory,
		PendingDirectory: pendingDirectory,
		MaxFileSize:      maxFileSize,
		BaseURL:          baseURL,
		WebPQuality:      webpQuality,
	}
}

func loadCDNConfig() CDNConfig {
	baseURL := os.Getenv("CDN_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}

	hmacSecret := os.Getenv("HMAC_SECRET")
	if hmacSecret == "" {
		hmacSecret = "change-me-in-production"
	}

	urlTTLSecs := int64(24 * 60 * 60) // 24 hours default
	if ttl := os.Getenv("CDN_URL_TTL_SECS"); ttl != "" {
		if parsed, err := strconv.ParseInt(ttl, 10, 64); err == nil {
			urlTTLSecs = parsed
		}
	}

	return CDNConfig{
		BaseURL:    baseURL,
		HMACSecret: hmacSecret,
		URLTTLSecs: urlTTLSecs,
	}
}
