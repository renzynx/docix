package redis

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	client     *redis.Client
	clientOnce sync.Once
	clientErr  error
)

// GetClient returns a singleton Redis client instance.
// The client is initialized on first call using configuration from environment.
// Thread-safe for concurrent access.
func GetClient() (*redis.Client, error) {
	clientOnce.Do(func() {
		cfg := LoadConfig()
		client, clientErr = NewClient(cfg)
	})

	if clientErr != nil {
		return nil, clientErr
	}

	return client, nil
}

// MustGetClient returns a singleton Redis client instance.
// Panics if the client cannot be created.
func MustGetClient() *redis.Client {
	c, err := GetClient()
	if err != nil {
		panic(fmt.Sprintf("failed to create Redis client: %v", err))
	}
	return c
}

// NewClient creates a new Redis client from the given configuration.
// Use GetClient() for singleton pattern.
func NewClient(cfg *Config) (*redis.Client, error) {
	var opts *redis.Options
	var err error

	if cfg.URL != "" {
		opts, err = redis.ParseURL(cfg.URL)
		if err != nil {
			return nil, fmt.Errorf("invalid Redis URL: %w", err)
		}
		// Apply pool size from config
		if cfg.PoolSize > 0 {
			opts.PoolSize = cfg.PoolSize
		}
	} else {
		opts = &redis.Options{
			Addr:         cfg.Addr,
			Password:     cfg.Password,
			DB:           cfg.DB,
			PoolSize:     cfg.PoolSize,
			DialTimeout:  10 * time.Second,
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
			PoolTimeout:  30 * time.Second,
		}
	}

	rdb := redis.NewClient(opts)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return rdb, nil
}

// NewClientFromURL creates a new Redis client from a URL string.
func NewClientFromURL(url string) (*redis.Client, error) {
	cfg := &Config{URL: url, PoolSize: 10}
	return NewClient(cfg)
}

// HealthCheck performs a health check on the Redis connection.
// Returns nil if healthy, error otherwise.
func HealthCheck(ctx context.Context) error {
	c, err := GetClient()
	if err != nil {
		return fmt.Errorf("client not available: %w", err)
	}

	if err := c.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	return nil
}

// HealthCheckWithClient performs a health check on a specific Redis client.
func HealthCheckWithClient(ctx context.Context, c *redis.Client) error {
	if c == nil {
		return fmt.Errorf("client is nil")
	}

	if err := c.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	return nil
}

// Close closes the singleton Redis client connection.
// Safe to call multiple times.
func Close() error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// Stats returns pool statistics for the singleton client.
func Stats() (*redis.PoolStats, error) {
	c, err := GetClient()
	if err != nil {
		return nil, err
	}
	stats := c.PoolStats()
	return stats, nil
}

// ResetClient resets the singleton client (for testing purposes).
// After calling this, the next GetClient call will create a new client.
func ResetClient() {
	if client != nil {
		client.Close()
	}
	client = nil
	clientErr = nil
	clientOnce = sync.Once{}
}
