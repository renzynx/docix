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

			if origin != "" && isOriginAllowed(origin, cfg.TrustedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
	origin = strings.TrimSuffix(origin, "/")

	for _, allowed := range allowedOrigins {
		allowed = strings.TrimSuffix(allowed, "/")

		if origin == allowed {
			return true
		}

		if strings.HasPrefix(allowed, "*.") {
			suffix := allowed[1:]
			if before, ok := strings.CutSuffix(origin, suffix); ok {
				prefix := before
				if strings.HasSuffix(prefix, "://") || strings.HasSuffix(prefix, ".") {
					return true
				}
			}
		}
	}

	return slices.Contains(allowedOrigins, origin)
}
