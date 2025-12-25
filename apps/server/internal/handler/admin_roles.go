package handler

import (
	"net/http"

	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func (h *AdminHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.RBAC.GetAllRoles(r.Context())
	if err != nil {
		log.Error("Failed to list roles: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list roles")
		return
	}

	response.JSON(w, http.StatusOK, roles)
}

func (h *AdminHandler) GetRole(w http.ResponseWriter, r *http.Request) {
	roleID := r.PathValue("id")
	if roleID == "" {
		response.Error(w, http.StatusBadRequest, "Role ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(roleID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid role ID")
		return
	}

	role, err := h.RBAC.GetRole(r.Context(), objID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusNotFound, "Role not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "Failed to get role")
		return
	}

	response.JSON(w, http.StatusOK, role)
}

func (h *AdminHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	req, ok := validator.HandleRequest[models.CreateRoleRequest](w, r)
	if !ok {
		return
	}

	for _, perm := range req.Permissions {
		if !isValidPermission(perm) {
			response.Error(w, http.StatusBadRequest, "Invalid permission: "+perm)
			return
		}
	}

	role := &models.Role{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Color:       req.Color,
		Priority:    req.Priority,
		Permissions: req.Permissions,
	}

	if err := h.RBAC.CreateRole(r.Context(), role); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Role name already exists")
			return
		}
		log.Error("Failed to create role: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create role")
		return
	}

	response.JSON(w, http.StatusCreated, role)
}

func (h *AdminHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	roleID := r.PathValue("id")
	if roleID == "" {
		response.Error(w, http.StatusBadRequest, "Role ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(roleID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid role ID")
		return
	}

	req, ok := validator.HandleRequest[models.UpdateRoleRequest](w, r)
	if !ok {
		return
	}

	updates := bson.M{}
	if req.DisplayName != nil {
		updates["display_name"] = *req.DisplayName
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Color != nil {
		updates["color"] = *req.Color
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.Permissions != nil {
		for _, perm := range req.Permissions {
			if !isValidPermission(perm) {
				response.Error(w, http.StatusBadRequest, "Invalid permission: "+perm)
				return
			}
		}
		updates["permissions"] = req.Permissions
	}

	if len(updates) == 0 {
		response.Error(w, http.StatusBadRequest, "No updates provided")
		return
	}

	if err := h.RBAC.UpdateRole(r.Context(), objID, updates); err != nil {
		log.Error("Failed to update role: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to update role")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Role updated successfully"})
}

func (h *AdminHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	roleID := r.PathValue("id")
	if roleID == "" {
		response.Error(w, http.StatusBadRequest, "Role ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(roleID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid role ID")
		return
	}

	role, err := h.RBAC.GetRole(r.Context(), objID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Role not found")
		return
	}

	if role.IsSystem {
		response.Error(w, http.StatusForbidden, "Cannot delete system role")
		return
	}

	if err := h.RBAC.DeleteRole(r.Context(), objID); err != nil {
		log.Error("Failed to delete role: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to delete role")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Role deleted successfully"})
}

func (h *AdminHandler) AssignRole(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetUserFromContext(r.Context())

	req, ok := validator.HandleRequest[models.AssignRoleRequest](w, r)
	if !ok {
		return
	}

	userID, err := bson.ObjectIDFromHex(req.UserID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	roleID, err := bson.ObjectIDFromHex(req.RoleID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid role ID")
		return
	}

	role, err := h.RBAC.GetRole(r.Context(), roleID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Role not found")
		return
	}

	canManage, err := h.RBAC.CanUserManageRole(r.Context(), actor, role)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}

	if !canManage {
		response.Error(w, http.StatusForbidden, "Cannot assign role with higher or equal priority")
		return
	}

	if err := h.RBAC.AssignRole(r.Context(), userID, roleID); err != nil {
		log.Error("Failed to assign role: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to assign role")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Role assigned successfully"})
}

func (h *AdminHandler) RemoveRole(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetUserFromContext(r.Context())

	req, ok := validator.HandleRequest[models.AssignRoleRequest](w, r)
	if !ok {
		return
	}

	userID, err := bson.ObjectIDFromHex(req.UserID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	roleID, err := bson.ObjectIDFromHex(req.RoleID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid role ID")
		return
	}

	role, err := h.RBAC.GetRole(r.Context(), roleID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Role not found")
		return
	}

	canManage, err := h.RBAC.CanUserManageRole(r.Context(), actor, role)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}

	if !canManage {
		response.Error(w, http.StatusForbidden, "Cannot remove role with higher or equal priority")
		return
	}

	if err := h.RBAC.RemoveRole(r.Context(), userID, roleID); err != nil {
		log.Error("Failed to remove role: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to remove role")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Role removed successfully"})
}
