package redis

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	viewDedupKeyPrefix = "view:dedup:"
	viewCountKeyPrefix = "view:count:"
	viewDedupTTL       = 1 * time.Hour
)

type ViewTracker struct {
	client *redis.Client
}

func NewViewTracker(client *redis.Client) *ViewTracker {
	return &ViewTracker{client: client}
}

// RecordView checks if the view is unique and increments the counter if so.
// Returns true if this was a new view, false if already recorded within the TTL window.
// identifier should be a hash of (user_id or session_id or IP)
func (vt *ViewTracker) RecordView(ctx context.Context, resourceType, resourceID, identifier string) (bool, error) {
	dedupKey := fmt.Sprintf("%s%s:%s:%s", viewDedupKeyPrefix, resourceType, resourceID, identifier)
	countKey := fmt.Sprintf("%s%s:%s", viewCountKeyPrefix, resourceType, resourceID)

	// SETNX with TTL - only succeeds if key doesn't exist
	set, err := vt.client.SetNX(ctx, dedupKey, "1", viewDedupTTL).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check view dedup: %w", err)
	}

	if !set {
		return false, nil
	}

	// New view - increment the counter
	if err := vt.client.Incr(ctx, countKey).Err(); err != nil {
		return true, fmt.Errorf("failed to increment view count: %w", err)
	}

	return true, nil
}

// PendingViewCount represents a pending view count to sync to the database
type PendingViewCount struct {
	ResourceType string
	ResourceID   string
	Count        int64
}

// GetPendingViews retrieves all pending view counts from Redis
func (vt *ViewTracker) GetPendingViews(ctx context.Context) ([]PendingViewCount, error) {
	var cursor uint64
	var results []PendingViewCount
	pattern := viewCountKeyPrefix + "*"

	for {
		keys, nextCursor, err := vt.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return nil, fmt.Errorf("failed to scan view count keys: %w", err)
		}

		for _, key := range keys {
			count, err := vt.client.Get(ctx, key).Int64()
			if err != nil {
				if err == redis.Nil {
					continue
				}
				return nil, fmt.Errorf("failed to get count for %s: %w", key, err)
			}

			if count == 0 {
				continue
			}

			// Parse key: view:count:{type}:{id}
			parts := strings.TrimPrefix(key, viewCountKeyPrefix)
			typeParts := strings.SplitN(parts, ":", 2)
			if len(typeParts) != 2 {
				continue
			}

			results = append(results, PendingViewCount{
				ResourceType: typeParts[0],
				ResourceID:   typeParts[1],
				Count:        count,
			})
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return results, nil
}

// GetAndResetCount atomically gets the current count and resets it to 0.
// Uses GETSET to ensure no views are lost during sync.
func (vt *ViewTracker) GetAndResetCount(ctx context.Context, resourceType, resourceID string) (int64, error) {
	key := fmt.Sprintf("%s%s:%s", viewCountKeyPrefix, resourceType, resourceID)

	// GETDEL atomically gets and deletes the key
	val, err := vt.client.GetDel(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get and reset count: %w", err)
	}

	count, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse count: %w", err)
	}

	return count, nil
}

// GetViewCount returns the current pending view count for a resource (for debugging/monitoring)
func (vt *ViewTracker) GetViewCount(ctx context.Context, resourceType, resourceID string) (int64, error) {
	key := fmt.Sprintf("%s%s:%s", viewCountKeyPrefix, resourceType, resourceID)

	count, err := vt.client.Get(ctx, key).Int64()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, err
	}

	return count, nil
}
