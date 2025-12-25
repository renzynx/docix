package handler

import (
	"context"
	"net/http"

	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
)

type SiteConfigProvider interface {
	GetSiteConfig(ctx context.Context) (*models.SiteConfig, error)
	GetMaintenanceConfig(ctx context.Context) (*models.MaintenanceConfig, error)
}

type SiteConfigHandler struct {
	Settings SiteConfigProvider
}

func NewSiteConfigHandler(settings SiteConfigProvider) *SiteConfigHandler {
	return &SiteConfigHandler{Settings: settings}
}

type PublicSiteConfig struct {
	models.SiteConfig
	Maintenance *PublicMaintenanceInfo `json:"maintenance,omitempty"`
}

type PublicMaintenanceInfo struct {
	Enabled bool   `json:"enabled"`
	Message string `json:"message"`
}

func (h *SiteConfigHandler) GetSiteConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	config, err := h.Settings.GetSiteConfig(ctx)
	if err != nil {
		log.Error("Failed to get site config: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get site config")
		return
	}

	maintenanceConfig, err := h.Settings.GetMaintenanceConfig(ctx)
	if err != nil {
		log.Warn("Failed to get maintenance config: ", err)
	}

	result := PublicSiteConfig{
		SiteConfig: *config,
	}

	if maintenanceConfig != nil && maintenanceConfig.Enabled {
		result.Maintenance = &PublicMaintenanceInfo{
			Enabled: true,
			Message: maintenanceConfig.Message,
		}
	}

	response.JSON(w, http.StatusOK, result)
}
