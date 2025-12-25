package redis

import (
	"os"
	"strconv"
	"strings"

	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	Addr     string
	Password string
	DB       int
	PoolSize int
	URL      string
}

func DefaultConfig() *Config {
	return &Config{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
		PoolSize: 10,
	}
}

func LoadConfig() *Config {
	cfg := DefaultConfig()

	if url := os.Getenv("REDIS_URL"); url != "" {
		cfg.URL = url
		return cfg
	}

	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	cfg.Addr = host + ":" + port

	cfg.Password = os.Getenv("REDIS_PASSWORD")

	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if db, err := strconv.Atoi(dbStr); err == nil && db >= 0 && db <= 15 {
			cfg.DB = db
		}
	}

	if poolStr := os.Getenv("REDIS_POOL_SIZE"); poolStr != "" {
		if pool, err := strconv.Atoi(poolStr); err == nil && pool > 0 {
			cfg.PoolSize = pool
		}
	}

	return cfg
}

func ParseURL(url string) (*Config, error) {
	cfg := DefaultConfig()
	cfg.URL = url

	url = strings.TrimPrefix(url, "redis://")
	url = strings.TrimPrefix(url, "rediss://")

	if atIdx := strings.LastIndex(url, "@"); atIdx != -1 {
		authPart := url[:atIdx]
		url = url[atIdx+1:]

		if colonIdx := strings.Index(authPart, ":"); colonIdx != -1 {
			cfg.Password = authPart[colonIdx+1:]
		}
	}

	if slashIdx := strings.LastIndex(url, "/"); slashIdx != -1 {
		dbStr := url[slashIdx+1:]
		if qIdx := strings.Index(dbStr, "?"); qIdx != -1 {
			dbStr = dbStr[:qIdx]
		}
		url = url[:slashIdx]

		if db, err := strconv.Atoi(dbStr); err == nil && db >= 0 && db <= 15 {
			cfg.DB = db
		}
	}

	cfg.Addr = url
	if !strings.Contains(cfg.Addr, ":") {
		cfg.Addr += ":6379"
	}

	return cfg, nil
}
