package middleware

import (
	"net/http"
	"slices"
	"strings"

	"github.com/renzynx/docix/server/internal/config"
)

func CORS() func(http.Handler) http.Handler {
	cfg := config.Get()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is trusted
			if origin != "" && isOriginAllowed(origin, cfg.TrustedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours
			}

			// Handle preflight requests
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
	// Normalize origin (remove trailing slash)
	origin = strings.TrimSuffix(origin, "/")

	for _, allowed := range allowedOrigins {
		allowed = strings.TrimSuffix(allowed, "/")

		// Exact match
		if origin == allowed {
			return true
		}

		// Wildcard match (e.g., "*.example.com")
		if strings.HasPrefix(allowed, "*.") {
			suffix := allowed[1:] // Remove the "*"
			if before, ok := strings.CutSuffix(origin, suffix); ok {
				// Ensure it's a subdomain match, not partial
				// e.g., "https://sub.example.com" matches "*.example.com"
				// but "https://notexample.com" does not
				prefix := before
				if strings.HasSuffix(prefix, "://") || strings.HasSuffix(prefix, ".") {
					return true
				}
			}
		}
	}

	return slices.Contains(allowedOrigins, origin)
}
