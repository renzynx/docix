package handler

import (
	"net/http"
	"time"

	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

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
