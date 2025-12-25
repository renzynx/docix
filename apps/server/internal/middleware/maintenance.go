package middleware

import (
	"net/http"
	"strings"

	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/settings"
)

// Maintenance blocks requests when maintenance mode is enabled.
// Always allows /health, /auth, /admin, /site-config routes, and IPs in the allowed list.
func Maintenance(settingsService *settings.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path

			// Always allow health checks, auth, admin, and site-config routes
			if strings.HasPrefix(path, "/health") ||
				strings.HasPrefix(path, "/auth") ||
				strings.HasPrefix(path, "/admin") ||
				path == "/site-config" {
				next.ServeHTTP(w, r)
				return
			}

			enabled, message, allowedIPsStr := settingsService.IsMaintenanceMode(r.Context())
			if !enabled {
				next.ServeHTTP(w, r)
				return
			}

			clientIP := getClientIP(r)
			if isIPAllowed(clientIP, allowedIPsStr) {
				next.ServeHTTP(w, r)
				return
			}

			if message == "" {
				message = "We are currently performing maintenance. Please check back soon."
			}

			w.Header().Set("Retry-After", "300")
			response.Error(w, http.StatusServiceUnavailable, message)
		})
	}
}

func getClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	ip := r.RemoteAddr
	if colonIndex := strings.LastIndex(ip, ":"); colonIndex != -1 {
		ip = ip[:colonIndex]
	}
	return ip
}

// isIPAllowed checks if the given IP is in the allowed list
func isIPAllowed(ip, allowedIPsStr string) bool {
	if allowedIPsStr == "" {
		return false
	}

	allowedIPs := strings.Split(allowedIPsStr, ",")
	for _, allowed := range allowedIPs {
		allowed = strings.TrimSpace(allowed)
		if allowed == "" {
			continue
		}
		if ip == allowed {
			return true
		}
		// Support simple CIDR-like patterns (e.g., "192.168.1.")
		if strings.HasSuffix(allowed, ".") && strings.HasPrefix(ip, allowed) {
			return true
		}
	}
	return false
}
