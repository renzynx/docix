package redis_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/renzynx/docix/packages/go/redis"
)

func TestConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Use test Redis or skip
	if os.Getenv("REDIS_HOST") == "" && os.Getenv("REDIS_URL") == "" {
		t.Skip("REDIS_HOST or REDIS_URL not set, skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := redis.HealthCheck(ctx)
	if err != nil {
		t.Fatalf("HealthCheck failed: %v", err)
	}

	t.Log("Redis connection successful")
}

func TestClientOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	if os.Getenv("REDIS_HOST") == "" && os.Getenv("REDIS_URL") == "" {
		t.Skip("REDIS_HOST or REDIS_URL not set, skipping integration test")
	}

	client, err := redis.GetClient()
	if err != nil {
		t.Fatalf("GetClient failed: %v", err)
	}

	ctx := context.Background()

	// Test SET/GET
	testKey := "test:docix:connection"
	testValue := "hello-redis"

	err = client.Set(ctx, testKey, testValue, time.Minute).Err()
	if err != nil {
		t.Fatalf("SET failed: %v", err)
	}

	got, err := client.Get(ctx, testKey).Result()
	if err != nil {
		t.Fatalf("GET failed: %v", err)
	}

	if got != testValue {
		t.Errorf("Expected %q, got %q", testValue, got)
	}

	// Cleanup
	client.Del(ctx, testKey)

	t.Log("Redis operations successful")
}

func TestConfig(t *testing.T) {
	// Test default config
	cfg := redis.DefaultConfig()
	if cfg.Addr != "localhost:6379" {
		t.Errorf("Expected default addr localhost:6379, got %s", cfg.Addr)
	}
	if cfg.PoolSize != 10 {
		t.Errorf("Expected default pool size 10, got %d", cfg.PoolSize)
	}
}

func TestParseURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		wantAddr string
		wantDB   int
		wantPass string
	}{
		{
			name:     "simple",
			url:      "redis://localhost:6379",
			wantAddr: "localhost:6379",
			wantDB:   0,
			wantPass: "",
		},
		{
			name:     "with db",
			url:      "redis://localhost:6379/5",
			wantAddr: "localhost:6379",
			wantDB:   5,
			wantPass: "",
		},
		{
			name:     "with password",
			url:      "redis://:mypassword@localhost:6379/0",
			wantAddr: "localhost:6379",
			wantDB:   0,
			wantPass: "mypassword",
		},
		{
			name:     "full",
			url:      "redis://user:secret@redis.example.com:6380/3",
			wantAddr: "redis.example.com:6380",
			wantDB:   3,
			wantPass: "secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := redis.ParseURL(tt.url)
			if err != nil {
				t.Fatalf("ParseURL failed: %v", err)
			}

			if cfg.Addr != tt.wantAddr {
				t.Errorf("Addr = %q, want %q", cfg.Addr, tt.wantAddr)
			}
			if cfg.DB != tt.wantDB {
				t.Errorf("DB = %d, want %d", cfg.DB, tt.wantDB)
			}
			if cfg.Password != tt.wantPass {
				t.Errorf("Password = %q, want %q", cfg.Password, tt.wantPass)
			}
		})
	}
}
