package handler

import (
	"context"
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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
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

// GetDashboardStats returns aggregate statistics for the admin dashboard
func (h *AdminHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get total counts in parallel using goroutines would be more efficient,
	// but for simplicity we'll do sequential queries
	totalUsers, err := h.DB.Users.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Error("Failed to count users: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	verifiedUsers, err := h.DB.Users.CountDocuments(ctx, bson.M{"verified_at": bson.M{"$ne": nil}})
	if err != nil {
		log.Error("Failed to count verified users: ", err)
		verifiedUsers = 0
	}

	bannedUsers, err := h.DB.Users.CountDocuments(ctx, bson.M{"is_banned": true})
	if err != nil {
		log.Error("Failed to count banned users: ", err)
		bannedUsers = 0
	}

	totalSeries, err := h.DB.Series.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Error("Failed to count series: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	totalChapters, err := h.DB.Chapters.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Error("Failed to count chapters: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	// Get total views from series
	var totalViews int64
	viewsPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{"_id": nil, "total": bson.M{"$sum": "$view_count"}}}},
	}
	viewsCursor, err := h.DB.Series.Aggregate(ctx, viewsPipeline)
	if err == nil {
		defer viewsCursor.Close(ctx)
		if viewsCursor.Next(ctx) {
			var result struct {
				Total int64 `bson:"total"`
			}
			if err := viewsCursor.Decode(&result); err == nil {
				totalViews = result.Total
			}
		}
	}

	// Get series by status
	seriesByStatus := make(map[string]int64)
	statusPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{"_id": "$status", "count": bson.M{"$sum": 1}}}},
	}
	statusCursor, err := h.DB.Series.Aggregate(ctx, statusPipeline)
	if err == nil {
		defer statusCursor.Close(ctx)
		for statusCursor.Next(ctx) {
			var result struct {
				ID    string `bson:"_id"`
				Count int64  `bson:"count"`
			}
			if err := statusCursor.Decode(&result); err == nil {
				seriesByStatus[result.ID] = result.Count
			}
		}
	}

	// Get recent series (last 5)
	var recentSeries []models.Series
	recentSeriesCursor, err := h.DB.Series.Find(ctx, bson.M{},
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetLimit(5),
	)
	if err == nil {
		defer recentSeriesCursor.Close(ctx)
		_ = recentSeriesCursor.All(ctx, &recentSeries)
	}

	// Get recent users (last 5)
	var recentUsers []models.User
	recentUsersCursor, err := h.DB.Users.Find(ctx, bson.M{},
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetLimit(5),
	)
	if err == nil {
		defer recentUsersCursor.Close(ctx)
		_ = recentUsersCursor.All(ctx, &recentUsers)
	}

	// Get user registrations for last 7 days
	userRegistrations := h.getDailyCounts(ctx, h.DB.Users, 7)

	// Get chapter uploads for last 7 days
	chapterUploads := h.getDailyCounts(ctx, h.DB.Chapters, 7)

	// Get top 5 series by views
	topSeriesByViews := h.getTopSeriesByViews(ctx, 5)

	stats := models.DashboardStats{
		TotalUsers:        totalUsers,
		TotalSeries:       totalSeries,
		TotalChapters:     totalChapters,
		TotalViews:        totalViews,
		VerifiedUsers:     verifiedUsers,
		BannedUsers:       bannedUsers,
		SeriesByStatus:    seriesByStatus,
		UserRegistrations: userRegistrations,
		ChapterUploads:    chapterUploads,
		TopSeriesByViews:  topSeriesByViews,
		RecentSeries:      recentSeries,
		RecentUsers:       recentUsers,
	}

	response.JSON(w, http.StatusOK, stats)
}

// getDailyCounts returns document counts grouped by day for the last N days
func (h *AdminHandler) getDailyCounts(ctx context.Context, collection *mongo.Collection, days int) []models.DailyCount {
	// Calculate the start date (N days ago at midnight UTC)
	now := time.Now().UTC()
	startDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))

	pipeline := mongo.Pipeline{
		// Match documents from the last N days
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": startDate},
		}}},
		// Group by date
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{
					"format": "%Y-%m-%d",
					"date":   "$created_at",
				},
			},
			"count": bson.M{"$sum": 1},
		}}},
		// Sort by date ascending
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Error("Failed to get daily counts: ", err)
		return h.emptyDailyCounts(days)
	}
	defer cursor.Close(ctx)

	// Create a map of date -> count from results
	countMap := make(map[string]int64)
	for cursor.Next(ctx) {
		var result struct {
			ID    string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if err := cursor.Decode(&result); err == nil {
			countMap[result.ID] = result.Count
		}
	}

	// Fill in all days (including those with 0 count)
	result := make([]models.DailyCount, days)
	for i := 0; i < days; i++ {
		date := startDate.AddDate(0, 0, i)
		dateStr := date.Format("2006-01-02")
		result[i] = models.DailyCount{
			Date:  dateStr,
			Count: countMap[dateStr], // Will be 0 if not in map
		}
	}

	return result
}

// emptyDailyCounts returns an array of DailyCount with 0 counts for the last N days
func (h *AdminHandler) emptyDailyCounts(days int) []models.DailyCount {
	now := time.Now().UTC()
	startDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))

	result := make([]models.DailyCount, days)
	for i := 0; i < days; i++ {
		date := startDate.AddDate(0, 0, i)
		result[i] = models.DailyCount{
			Date:  date.Format("2006-01-02"),
			Count: 0,
		}
	}
	return result
}

// getTopSeriesByViews returns the top N series by view count
func (h *AdminHandler) getTopSeriesByViews(ctx context.Context, limit int) []models.SeriesViewCount {
	cursor, err := h.DB.Series.Find(ctx, bson.M{},
		options.Find().
			SetSort(bson.D{{Key: "view_count", Value: -1}}).
			SetLimit(int64(limit)).
			SetProjection(bson.M{"_id": 1, "title": 1, "view_count": 1}),
	)
	if err != nil {
		log.Error("Failed to get top series by views: ", err)
		return []models.SeriesViewCount{}
	}
	defer cursor.Close(ctx)

	var results []models.SeriesViewCount
	for cursor.Next(ctx) {
		var series struct {
			ID        bson.ObjectID `bson:"_id"`
			Title     string        `bson:"title"`
			ViewCount int64         `bson:"view_count"`
		}
		if err := cursor.Decode(&series); err == nil {
			results = append(results, models.SeriesViewCount{
				ID:        series.ID.Hex(),
				Title:     series.Title,
				ViewCount: series.ViewCount,
			})
		}
	}

	return results
}
