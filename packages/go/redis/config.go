package redis

import (
	"os"
	"strconv"
	"strings"

	_ "github.com/joho/godotenv/autoload"
)

// Config holds Redis connection configuration
type Config struct {
	// Addr is the Redis server address (host:port)
	Addr string

	// Password for Redis authentication (empty if no auth)
	Password string

	// DB is the Redis database number (0-15)
	DB int

	// PoolSize is the maximum number of connections in the pool
	PoolSize int

	// URL is the full Redis URL (takes precedence over individual settings)
	URL string
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
		PoolSize: 10,
	}
}

// LoadConfig loads Redis configuration from environment variables
//
// Environment variables:
//   - REDIS_URL: Full Redis URL (e.g., redis://user:password@localhost:6379/0)
//   - REDIS_HOST: Redis host (default: localhost)
//   - REDIS_PORT: Redis port (default: 6379)
//   - REDIS_PASSWORD: Redis password (default: empty)
//   - REDIS_DB: Redis database number (default: 0)
//   - REDIS_POOL_SIZE: Connection pool size (default: 10)
//
// If REDIS_URL is set, it takes precedence over individual settings.
func LoadConfig() *Config {
	cfg := DefaultConfig()

	// Check for full URL first
	if url := os.Getenv("REDIS_URL"); url != "" {
		cfg.URL = url
		return cfg
	}

	// Build address from host and port
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	cfg.Addr = host + ":" + port

	// Password
	cfg.Password = os.Getenv("REDIS_PASSWORD")

	// Database number
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if db, err := strconv.Atoi(dbStr); err == nil && db >= 0 && db <= 15 {
			cfg.DB = db
		}
	}

	// Pool size
	if poolStr := os.Getenv("REDIS_POOL_SIZE"); poolStr != "" {
		if pool, err := strconv.Atoi(poolStr); err == nil && pool > 0 {
			cfg.PoolSize = pool
		}
	}

	return cfg
}

// ParseURL extracts configuration from a Redis URL
// Format: redis://[user:password@]host[:port][/db]
func ParseURL(url string) (*Config, error) {
	cfg := DefaultConfig()
	cfg.URL = url

	// Remove scheme
	url = strings.TrimPrefix(url, "redis://")
	url = strings.TrimPrefix(url, "rediss://")

	// Extract password if present
	if atIdx := strings.LastIndex(url, "@"); atIdx != -1 {
		authPart := url[:atIdx]
		url = url[atIdx+1:]

		// Check for user:password format
		if colonIdx := strings.Index(authPart, ":"); colonIdx != -1 {
			cfg.Password = authPart[colonIdx+1:]
		}
	}

	// Extract DB if present
	if slashIdx := strings.LastIndex(url, "/"); slashIdx != -1 {
		dbStr := url[slashIdx+1:]
		// Remove query parameters if any
		if qIdx := strings.Index(dbStr, "?"); qIdx != -1 {
			dbStr = dbStr[:qIdx]
		}
		url = url[:slashIdx]

		if db, err := strconv.Atoi(dbStr); err == nil && db >= 0 && db <= 15 {
			cfg.DB = db
		}
	}

	// Remaining is host:port
	cfg.Addr = url
	if !strings.Contains(cfg.Addr, ":") {
		cfg.Addr += ":6379"
	}

	return cfg, nil
}
