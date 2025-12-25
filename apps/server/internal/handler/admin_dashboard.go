package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// GetDashboardStats returns aggregate statistics for the admin dashboard
func (h *AdminHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

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

	userRegistrations := h.getDailyCounts(ctx, h.DB.Users, 7)

	chapterUploads := h.getDailyCounts(ctx, h.DB.Chapters, 7)

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
	now := time.Now().UTC()
	startDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": startDate},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{
					"format": "%Y-%m-%d",
					"date":   "$created_at",
				},
			},
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Error("Failed to get daily counts: ", err)
		return h.emptyDailyCounts(days)
	}
	defer cursor.Close(ctx)

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

	result := make([]models.DailyCount, days)
	for i := range days {
		date := startDate.AddDate(0, 0, i)
		dateStr := date.Format("2006-01-02")
		result[i] = models.DailyCount{
			Date:  dateStr,
			Count: countMap[dateStr],
		}
	}

	return result
}

// emptyDailyCounts returns an array of DailyCount with 0 counts for the last N days
func (h *AdminHandler) emptyDailyCounts(days int) []models.DailyCount {
	now := time.Now().UTC()
	startDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))

	result := make([]models.DailyCount, days)
	for i := range days {
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
