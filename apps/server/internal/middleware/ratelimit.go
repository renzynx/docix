package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/response"
)

const (
	rateLimitKeyPrefix = "ratelimit:"
)

type RateLimitConfig struct {
	Requests int
	Window   time.Duration
	Message  string
}

type RateLimiter struct {
	redis       *goredis.Client
	rbacService *rbac.Service
	config      map[string]RateLimitConfig
	global      RateLimitConfig
}

func NewRateLimiter(rbacService *rbac.Service) *RateLimiter {
	return &RateLimiter{
		redis:       redis.MustGetClient(),
		rbacService: rbacService,
		config:      make(map[string]RateLimitConfig),
		global: RateLimitConfig{
			Requests: 100,
			Window:   time.Minute,
			Message:  "Too many requests, please try again later",
		},
	}
}

func (rl *RateLimiter) WithRouteLimit(path string, requests int, window time.Duration, message string) *RateLimiter {
	rl.config[path] = RateLimitConfig{
		Requests: requests,
		Window:   window,
		Message:  message,
	}
	return rl
}

func (rl *RateLimiter) WithGlobalLimit(requests int, window time.Duration) *RateLimiter {
	rl.global = RateLimitConfig{
		Requests: requests,
		Window:   window,
		Message:  "Too many requests, please try again later",
	}
	return rl
}

func (rl *RateLimiter) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user != nil {
				hasAdminAccess, _ := rl.rbacService.UserHasPermission(r.Context(), user, constants.PermAdminPanel)
				if hasAdminAccess {
					next.ServeHTTP(w, r)
					return
				}
			}

			clientIP := getClientIP(r)
			path := r.URL.Path

			config := rl.getConfigForPath(path)

			key := rl.buildKey(clientIP, path)

			allowed, remaining, resetAt, err := rl.checkLimit(r.Context(), key, config)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.Requests))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetAt, 10))

			if !allowed {
				w.Header().Set("Retry-After", strconv.FormatInt(resetAt-time.Now().Unix(), 10))
				response.Error(w, http.StatusTooManyRequests, config.Message)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func (rl *RateLimiter) getConfigForPath(path string) RateLimitConfig {
	for route, config := range rl.config {
		if strings.HasPrefix(path, route) {
			return config
		}
	}
	return rl.global
}

func (rl *RateLimiter) buildKey(ip, path string) string {
	normalizedPath := strings.ReplaceAll(path, "/", ":")
	return fmt.Sprintf("%s%s%s", rateLimitKeyPrefix, ip, normalizedPath)
}

func (rl *RateLimiter) checkLimit(ctx context.Context, key string, config RateLimitConfig) (allowed bool, remaining int, resetAt int64, err error) {
	now := time.Now()
	windowStart := now.Truncate(config.Window)
	resetAt = windowStart.Add(config.Window).Unix()

	windowKey := fmt.Sprintf("%s:%d", key, windowStart.Unix())

	count, err := rl.redis.Incr(ctx, windowKey).Result()
	if err != nil {
		return true, config.Requests, resetAt, err
	}

	if count == 1 {
		rl.redis.Expire(ctx, windowKey, config.Window+time.Second)
	}

	remaining = config.Requests - int(count)
	if remaining < 0 {
		remaining = 0
	}

	return int(count) <= config.Requests, remaining, resetAt, nil
}

type LoginRateLimiter struct {
	redis            *goredis.Client
	rbacService      *rbac.Service
	settingsProvider LoginSettingsProvider
}

type LoginSettingsProvider interface {
	GetMaxLoginAttempts(ctx context.Context) int
}

func NewLoginRateLimiter(rbacService *rbac.Service, settings LoginSettingsProvider) *LoginRateLimiter {
	return &LoginRateLimiter{
		redis:            redis.MustGetClient(),
		rbacService:      rbacService,
		settingsProvider: settings,
	}
}

func (lrl *LoginRateLimiter) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				next.ServeHTTP(w, r)
				return
			}

			clientIP := getClientIP(r)
			maxAttempts := lrl.settingsProvider.GetMaxLoginAttempts(r.Context())

			if maxAttempts <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			key := fmt.Sprintf("%slogin:%s", rateLimitKeyPrefix, clientIP)

			count, ttl, err := lrl.getAttempts(r.Context(), key)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			if count >= maxAttempts {
				retryAfter := int64(ttl.Seconds())
				if retryAfter <= 0 {
					retryAfter = 300
				}

				w.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(maxAttempts))
				w.Header().Set("X-RateLimit-Remaining", "0")

				response.Error(w, http.StatusTooManyRequests,
					fmt.Sprintf("Too many login attempts. Please try again in %d minutes.", (retryAfter+59)/60))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func (lrl *LoginRateLimiter) RecordFailedAttempt(ctx context.Context, ip string) error {
	key := fmt.Sprintf("%slogin:%s", rateLimitKeyPrefix, ip)
	lockoutDuration := 5 * time.Minute

	count, err := lrl.redis.Incr(ctx, key).Result()
	if err != nil {
		return err
	}

	if count == 1 {
		lrl.redis.Expire(ctx, key, lockoutDuration)
	}

	return nil
}

func (lrl *LoginRateLimiter) ClearAttempts(ctx context.Context, ip string) error {
	key := fmt.Sprintf("%slogin:%s", rateLimitKeyPrefix, ip)
	return lrl.redis.Del(ctx, key).Err()
}

func (lrl *LoginRateLimiter) getAttempts(ctx context.Context, key string) (int, time.Duration, error) {
	count, err := lrl.redis.Get(ctx, key).Int()
	if err == goredis.Nil {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, err
	}

	ttl, err := lrl.redis.TTL(ctx, key).Result()
	if err != nil {
		return count, 0, nil
	}

	return count, ttl, nil
}
