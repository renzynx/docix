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
}

type SiteConfigHandler struct {
	Settings SiteConfigProvider
}

func NewSiteConfigHandler(settings SiteConfigProvider) *SiteConfigHandler {
	return &SiteConfigHandler{Settings: settings}
}

func (h *SiteConfigHandler) GetSiteConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	config, err := h.Settings.GetSiteConfig(ctx)
	if err != nil {
		log.Error("Failed to get site config: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get site config")
		return
	}

	response.JSON(w, http.StatusOK, config)
}
