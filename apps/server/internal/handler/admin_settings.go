package handler

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// Server start time for uptime calculation
var serverStartTime = time.Now()

// GetSiteSettings returns the current site settings
func (h *AdminHandler) GetSiteSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	settings, err := h.Settings.Get(ctx)
	if err != nil {
		log.Error("Failed to get site settings: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get settings")
		return
	}

	response.JSON(w, http.StatusOK, settings)
}

// UpdateSiteSettings updates site settings
func (h *AdminHandler) UpdateSiteSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, ok := validator.HandleRequest[models.UpdateSiteSettingsRequest](w, r)
	if !ok {
		return
	}

	// Get current settings to merge integrations
	currentSettings, err := h.Settings.Get(ctx)
	if err != nil {
		log.Error("Failed to get current settings: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get settings")
		return
	}

	updates := bson.M{}

	if req.Site != nil {
		updates["site"] = req.Site
	}
	if req.Content != nil {
		updates["content"] = req.Content
	}
	if req.Users != nil {
		updates["users"] = req.Users
	}
	if req.Maintenance != nil {
		updates["maintenance"] = req.Maintenance
	}
	if req.Integrations != nil {
		integ := currentSettings.Integrations
		if req.Integrations.SMTPHost != nil {
			integ.SMTPHost = *req.Integrations.SMTPHost
		}
		if req.Integrations.SMTPPort != nil {
			integ.SMTPPort = *req.Integrations.SMTPPort
		}
		if req.Integrations.SMTPUsername != nil {
			integ.SMTPUsername = *req.Integrations.SMTPUsername
		}
		if req.Integrations.SMTPPassword != nil && *req.Integrations.SMTPPassword != "" {
			integ.SMTPPassword = *req.Integrations.SMTPPassword
		}
		if req.Integrations.SMTPFromEmail != nil {
			integ.SMTPFromEmail = *req.Integrations.SMTPFromEmail
		}
		if req.Integrations.SMTPFromName != nil {
			integ.SMTPFromName = *req.Integrations.SMTPFromName
		}
		if req.Integrations.SMTPEnabled != nil {
			integ.SMTPEnabled = *req.Integrations.SMTPEnabled
		}
		if req.Integrations.CDNEnabled != nil {
			integ.CDNEnabled = *req.Integrations.CDNEnabled
		}
		if req.Integrations.CDNBaseURL != nil {
			integ.CDNBaseURL = *req.Integrations.CDNBaseURL
		}
		updates["integrations"] = integ
	}

	// Use the settings service to update (this also updates the cache)
	updatedSettings, err := h.Settings.Update(ctx, updates)
	if err != nil {
		log.Error("Failed to update site settings: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update settings")
		return
	}

	response.JSON(w, http.StatusOK, updatedSettings)
}

// PerformMaintenanceAction executes a maintenance action
func (h *AdminHandler) PerformMaintenanceAction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, ok := validator.HandleRequest[models.MaintenanceAction](w, r)
	if !ok {
		return
	}

	var result models.MaintenanceActionResponse

	switch req.Action {
	case "clear_cache":
		result = h.clearCache(ctx)
	case "clear_sessions":
		result = h.clearAllSessions(ctx)
	case "test_email":
		result = h.testEmail(ctx)
	case "invalidate_settings":
		result = h.invalidateSettingsCache(ctx)
	default:
		response.Error(w, http.StatusBadRequest, "Unknown action: "+req.Action)
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// GetSystemInfo returns system status information
func (h *AdminHandler) GetSystemInfo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	dbStatus := "connected"
	if err := h.DB.Client.Ping(ctx, nil); err != nil {
		dbStatus = "disconnected"
	}

	cacheStats := models.CacheStats{
		RedisConnected: false,
		KeyCount:       0,
		MemoryUsage:    "N/A",
	}

	redisClient, err := redis.GetClient()
	if err == nil {
		if err := redisClient.Ping(ctx).Err(); err == nil {
			cacheStats.RedisConnected = true

			if keyCount, err := redisClient.DBSize(ctx).Result(); err == nil {
				cacheStats.KeyCount = keyCount
			}

			if info, err := redisClient.Info(ctx, "memory").Result(); err == nil {
				cacheStats.MemoryUsage = parseRedisMemory(info)
			}
		}
	}

	systemInfo := models.SystemInfo{
		Version:        "1.0.0",
		GoVersion:      runtime.Version(),
		Uptime:         getUptime(),
		DatabaseStatus: dbStatus,
		CacheStats:     cacheStats,
	}

	response.JSON(w, http.StatusOK, systemInfo)
}

// clearCache clears Redis cache
func (h *AdminHandler) clearCache(ctx context.Context) models.MaintenanceActionResponse {
	redisClient, err := redis.GetClient()
	if err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Redis not available: " + err.Error(),
		}
	}

	if err := redisClient.FlushDB(ctx).Err(); err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Failed to clear cache: " + err.Error(),
		}
	}

	// Reload settings into cache after flush
	if err := h.Settings.Load(ctx); err != nil {
		log.Warnf("Failed to reload settings after cache clear: %v", err)
	}

	return models.MaintenanceActionResponse{
		Success: true,
		Message: "Cache cleared successfully",
	}
}

// clearAllSessions removes all user sessions
func (h *AdminHandler) clearAllSessions(ctx context.Context) models.MaintenanceActionResponse {
	result, err := h.DB.Sessions.DeleteMany(ctx, bson.M{})
	if err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Failed to clear sessions: " + err.Error(),
		}
	}

	return models.MaintenanceActionResponse{
		Success: true,
		Message: fmt.Sprintf("Cleared %d sessions", result.DeletedCount),
	}
}

// invalidateSettingsCache forces a reload of settings from database
func (h *AdminHandler) invalidateSettingsCache(ctx context.Context) models.MaintenanceActionResponse {
	if err := h.Settings.InvalidateCache(ctx); err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Failed to invalidate cache: " + err.Error(),
		}
	}

	// Reload settings
	if err := h.Settings.Load(ctx); err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Failed to reload settings: " + err.Error(),
		}
	}

	return models.MaintenanceActionResponse{
		Success: true,
		Message: "Settings cache invalidated and reloaded",
	}
}

// testEmail sends a test email to verify SMTP configuration
func (h *AdminHandler) testEmail(ctx context.Context) models.MaintenanceActionResponse {
	settings, err := h.Settings.Get(ctx)
	if err != nil {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "Failed to get settings: " + err.Error(),
		}
	}

	if !settings.Integrations.SMTPEnabled {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "SMTP is not enabled",
		}
	}

	if settings.Integrations.SMTPHost == "" {
		return models.MaintenanceActionResponse{
			Success: false,
			Message: "SMTP host not configured",
		}
	}

	// TODO: Actually send test email using the settings
	return models.MaintenanceActionResponse{
		Success: true,
		Message: "SMTP configuration appears valid (email sending not yet implemented)",
	}
}

// parseRedisMemory extracts used_memory_human from Redis INFO output
func parseRedisMemory(info string) string {
	for _, line := range strings.Split(info, "\n") {
		if strings.HasPrefix(line, "used_memory_human:") {
			return strings.TrimPrefix(line, "used_memory_human:")
		}
	}
	return "unknown"
}

// getUptime returns the server uptime as a human-readable string
func getUptime() string {
	uptime := time.Since(serverStartTime)
	days := int(uptime.Hours() / 24)
	hours := int(uptime.Hours()) % 24
	minutes := int(uptime.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}
