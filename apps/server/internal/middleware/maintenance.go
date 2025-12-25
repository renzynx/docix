package middleware

import (
	"net/http"
	"strings"

	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/settings"
)

// Maintenance returns a middleware that blocks requests when maintenance mode is enabled
// It allows requests from allowed IPs and to certain paths (like /health)
func Maintenance(settingsService *settings.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Always allow health checks
			if strings.HasPrefix(r.URL.Path, "/health") {
				next.ServeHTTP(w, r)
				return
			}

			// Always allow admin routes (admins can access during maintenance)
			if strings.HasPrefix(r.URL.Path, "/admin") {
				next.ServeHTTP(w, r)
				return
			}

			// Check maintenance mode
			enabled, message, allowedIPsStr := settingsService.IsMaintenanceMode(r.Context())
			if !enabled {
				next.ServeHTTP(w, r)
				return
			}

			// Check if client IP is in allowed list
			clientIP := getClientIP(r)
			if isIPAllowed(clientIP, allowedIPsStr) {
				next.ServeHTTP(w, r)
				return
			}

			// Return maintenance response
			if message == "" {
				message = "We are currently performing maintenance. Please check back soon."
			}

			w.Header().Set("Retry-After", "300") // Suggest retry after 5 minutes
			response.Error(w, http.StatusServiceUnavailable, message)
		})
	}
}

// getClientIP extracts the client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for proxied requests)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	// Remove port if present
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
