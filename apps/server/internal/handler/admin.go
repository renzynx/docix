package handler

import (
	"slices"

	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/settings"
)

type AdminHandler struct {
	DB       *database.Database
	RBAC     *rbac.Service
	Settings *settings.Service
}

func NewAdminHandler(db *database.Database, rbacService *rbac.Service, settingsService *settings.Service) *AdminHandler {
	return &AdminHandler{DB: db, RBAC: rbacService, Settings: settingsService}
}

func isValidPermission(perm string) bool {
	if perm == constants.PermWildcard {
		return true
	}
	return slices.Contains(constants.AllPermissions, perm)
}
