package handler

import (
	"net/http"
	"slices"
	"time"

	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type AdminHandler struct {
	DB   *database.Database
	RBAC *rbac.Service
}

func NewAdminHandler(db *database.Database, rbacService *rbac.Service) *AdminHandler {
	return &AdminHandler{DB: db, RBAC: rbacService}
}

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

func (h *AdminHandler) BanUser(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetUserFromContext(r.Context())

	req, ok := validator.HandleRequest[models.BanUserRequest](w, r)
	if !ok {
		return
	}

	userID, err := bson.ObjectIDFromHex(req.UserID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var target models.User
	if err := h.DB.Users.FindOne(r.Context(), bson.M{"_id": userID}).Decode(&target); err != nil {
		response.Error(w, http.StatusNotFound, "User not found")
		return
	}

	canManage, err := h.RBAC.CanUserManageUser(r.Context(), actor, &target)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
		return
	}

	if !canManage {
		response.Error(w, http.StatusForbidden, "Cannot ban user with higher or equal priority")
		return
	}

	now := time.Now()
	_, err = h.DB.Users.UpdateOne(r.Context(),
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"is_banned":  true,
			"ban_reason": req.Reason,
			"banned_at":  now,
			"updated_at": now,
		}},
	)
	if err != nil {
		log.Error("Failed to ban user: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to ban user")
		return
	}

	_, _ = h.DB.Sessions.DeleteMany(r.Context(), bson.M{"user_id": userID})

	response.JSON(w, http.StatusOK, map[string]string{"message": "User banned successfully"})
}

func (h *AdminHandler) UnbanUser(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")
	if userID == "" {
		response.Error(w, http.StatusBadRequest, "User ID required")
		return
	}

	objID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	_, err = h.DB.Users.UpdateOne(r.Context(),
		bson.M{"_id": objID},
		bson.M{
			"$set":   bson.M{"is_banned": false, "updated_at": time.Now()},
			"$unset": bson.M{"ban_reason": "", "banned_at": ""},
		},
	)
	if err != nil {
		log.Error("Failed to unban user: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to unban user")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "User unbanned successfully"})
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	cursor, err := h.DB.Users.Find(r.Context(), bson.M{})
	if err != nil {
		log.Error("Failed to list users: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list users")
		return
	}
	defer cursor.Close(r.Context())

	var users []models.User
	for cursor.Next(r.Context()) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}

		roles, _ := h.RBAC.GetUserRoles(r.Context(), &user)
		for _, role := range roles {
			user.Roles = append(user.Roles, *role)
		}

		users = append(users, user)
	}

	response.JSON(w, http.StatusOK, users)
}

func (h *AdminHandler) GetPermissions(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, constants.AllPermissions)
}

func (h *AdminHandler) GetUserPermissions(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())

	perms, err := h.RBAC.GetUserPermissions(r.Context(), user)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to get permissions")
		return
	}

	roles, _ := h.RBAC.GetUserRoles(r.Context(), user)
	var roleNames []string
	for _, role := range roles {
		roleNames = append(roleNames, role.Name)
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"permissions": perms,
		"roles":       roleNames,
	})
}

func isValidPermission(perm string) bool {
	if perm == constants.PermWildcard {
		return true
	}
	return slices.Contains(constants.AllPermissions, perm)
}
