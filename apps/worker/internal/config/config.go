package config

import (
	"os"
	"strconv"

	_ "github.com/joho/godotenv/autoload"
)

// Config holds worker configuration
type Config struct {
	// Redis connection settings
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Worker settings
	Concurrency int

	// Queue priorities (higher = more priority)
	Queues map[string]int

	// Upload directories
	UploadDir        string // Final upload directory
	PendingUploadDir string // Temporary pending directory

	// Image processing settings
	WebPQuality int  // 1-100, default 85
	MaxFileSize int64 // Maximum file size in bytes
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		RedisAddr:        "localhost:6379",
		RedisPassword:    "",
		RedisDB:          0,
		Concurrency:      10,
		Queues: map[string]int{
			"critical": 6,
			"default":  3,
			"low":      1,
		},
		UploadDir:        "./uploads",
		PendingUploadDir: "./uploads/pending",
		WebPQuality:      85,
		MaxFileSize:      50 * 1024 * 1024, // 50MB
	}
}

// Load loads configuration from environment variables
func Load() *Config {
	cfg := DefaultConfig()

	// Redis settings
	if addr := os.Getenv("REDIS_HOST"); addr != "" {
		port := os.Getenv("REDIS_PORT")
		if port == "" {
			port = "6379"
		}
		cfg.RedisAddr = addr + ":" + port
	}

	if url := os.Getenv("REDIS_URL"); url != "" {
		// For URL, asynq will parse it directly
		cfg.RedisAddr = url
	}

	cfg.RedisPassword = os.Getenv("REDIS_PASSWORD")

	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if db, err := strconv.Atoi(dbStr); err == nil {
			cfg.RedisDB = db
		}
	}

	// Worker settings
	if concStr := os.Getenv("WORKER_CONCURRENCY"); concStr != "" {
		if conc, err := strconv.Atoi(concStr); err == nil && conc > 0 {
			cfg.Concurrency = conc
		}
	}

	// Upload directories
	if dir := os.Getenv("UPLOAD_DIR"); dir != "" {
		cfg.UploadDir = dir
	}

	if dir := os.Getenv("PENDING_UPLOAD_DIR"); dir != "" {
		cfg.PendingUploadDir = dir
	} else {
		cfg.PendingUploadDir = cfg.UploadDir + "/pending"
	}

	// Image processing settings
	if qualityStr := os.Getenv("WEBP_QUALITY"); qualityStr != "" {
		if quality, err := strconv.Atoi(qualityStr); err == nil && quality >= 1 && quality <= 100 {
			cfg.WebPQuality = quality
		}
	}

	if sizeStr := os.Getenv("MAX_FILE_SIZE"); sizeStr != "" {
		if size, err := strconv.ParseInt(sizeStr, 10, 64); err == nil && size > 0 {
			cfg.MaxFileSize = size
		}
	}

	return cfg
}

// GetRedisOpt returns asynq-compatible Redis options
func (c *Config) GetRedisOpt() interface{} {
	// Check if it's a URL
	if len(c.RedisAddr) > 8 && c.RedisAddr[:8] == "redis://" {
		return c.RedisAddr
	}

	// Return structured options
	return struct {
		Addr     string
		Password string
		DB       int
	}{
		Addr:     c.RedisAddr,
		Password: c.RedisPassword,
		DB:       c.RedisDB,
	}
}
