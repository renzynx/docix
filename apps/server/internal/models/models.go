package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID         bson.ObjectID   `bson:"_id,omitempty" json:"id"`
	Email      string          `bson:"email" json:"email"`
	Password   string          `bson:"password" json:"-"`
	Username   string          `bson:"username,omitempty" json:"username,omitempty"`
	Avatar     string          `bson:"avatar,omitempty" json:"avatar,omitempty"`
	RoleIDs    []bson.ObjectID `bson:"role_ids" json:"-"`
	Roles      []Role          `bson:"-" json:"roles,omitempty"`
	VerifiedAt *time.Time      `bson:"verified_at,omitempty" json:"verified_at,omitempty"`
	IsBanned   bool            `bson:"is_banned" json:"is_banned"`
	BanReason  string          `bson:"ban_reason,omitempty" json:"ban_reason,omitempty"`
	BannedAt   *time.Time      `bson:"banned_at,omitempty" json:"banned_at,omitempty"`
	CreatedAt  time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time       `bson:"updated_at" json:"updated_at"`
}

type Session struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"user_id"`
	IPAddress string        `bson:"ip_address" json:"ip_address"`
	UserAgent string        `bson:"user_agent" json:"user_agent"`
	ExpiresAt time.Time     `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}

type Role struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string        `bson:"name" json:"name"`
	DisplayName string        `bson:"display_name" json:"display_name"`
	Description string        `bson:"description" json:"description"`
	Color       string        `bson:"color" json:"color"`
	Priority    int           `bson:"priority" json:"priority"`
	Permissions []string      `bson:"permissions" json:"permissions"`
	IsSystem    bool          `bson:"is_system" json:"is_system"`
	CreatedAt   time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
}

type SignUpRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Username string `json:"username" validate:"omitempty,username"`
}

type SignInRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}

// MessageResponse is a generic response with just a message
type MessageResponse struct {
	Message string `json:"message"`
}

// CurrentSessionResponse is returned when getting the current session
type CurrentSessionResponse struct {
	Session     SessionListItem `json:"session"`
	User        User            `json:"user"`
	Permissions []string        `json:"permissions"`
	Roles       []string        `json:"roles"`
}

// UserPermissionsResponse is returned when getting user permissions
type UserPermissionsResponse struct {
	Permissions []string `json:"permissions"`
	Roles       []string `json:"roles"`
}

// UpdateUserResponse is returned when updating user profile
type UpdateUserResponse struct {
	Message                   string `json:"message"`
	EmailVerificationRequired bool   `json:"email_verification_required,omitempty"`
	EmailVerificationToken    string `json:"email_verification_token,omitempty"`
}

// RequestVerificationResponse is returned when requesting email verification
type RequestVerificationResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
}

// BookmarkStatusResponse is returned when checking bookmark status
type BookmarkStatusResponse struct {
	Bookmarked bool   `json:"bookmarked"`
	BookmarkID string `json:"bookmark_id,omitempty"`
}

// ToggleBookmarkResponse is returned when toggling a bookmark
type ToggleBookmarkResponse struct {
	Bookmarked bool   `json:"bookmarked"`
	BookmarkID string `json:"bookmark_id,omitempty"`
	Message    string `json:"message"`
}

// HealthResponse is returned by the health check endpoint
type HealthResponse struct {
	Status string `json:"status"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type SessionListItem struct {
	ID        string    `json:"id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	IsCurrent bool      `json:"is_current"`
}

type RevokeSessionRequest struct {
	SessionID string `json:"session_id" validate:"required"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=1,max=50"`
	DisplayName string   `json:"display_name" validate:"omitempty,max=100"`
	Description string   `json:"description" validate:"omitempty,max=500"`
	Color       string   `json:"color" validate:"omitempty,hexcolor"`
	Priority    int      `json:"priority" validate:"gte=0"`
	Permissions []string `json:"permissions"`
}

type UpdateRoleRequest struct {
	DisplayName *string  `json:"display_name,omitempty" validate:"omitempty,max=100"`
	Description *string  `json:"description,omitempty" validate:"omitempty,max=500"`
	Color       *string  `json:"color,omitempty" validate:"omitempty,hexcolor"`
	Priority    *int     `json:"priority,omitempty" validate:"omitempty,gte=0"`
	Permissions []string `json:"permissions,omitempty"`
}

type AssignRoleRequest struct {
	UserID string `json:"user_id" validate:"required"`
	RoleID string `json:"role_id" validate:"required"`
}

type BanUserRequest struct {
	UserID string `json:"user_id" validate:"required"`
	Reason string `json:"reason" validate:"omitempty,max=500"`
}

type UpdateUserRequest struct {
	Email    *string `json:"email,omitempty" validate:"omitempty,email"`
	Username *string `json:"username,omitempty" validate:"omitempty,username"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

type SeriesStatus string

const (
	SeriesStatusOngoing   SeriesStatus = "ongoing"
	SeriesStatusCompleted SeriesStatus = "completed"
	SeriesStatusHiatus    SeriesStatus = "hiatus"
	SeriesStatusCancelled SeriesStatus = "cancelled"
)

type Tag struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string        `bson:"name" json:"name"`
	Slug        string        `bson:"slug" json:"slug"`
	Description string        `bson:"description,omitempty" json:"description,omitempty"`
	CreatedAt   time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
}

type Series struct {
	ID            bson.ObjectID   `bson:"_id,omitempty" json:"id"`
	Title         string          `bson:"title" json:"title"`
	Slug          string          `bson:"slug" json:"slug"`
	Description   string          `bson:"description,omitempty" json:"description,omitempty"`
	CoverImage    string          `bson:"cover_image,omitempty" json:"cover_image,omitempty"`
	CoverImageURL string          `bson:"-" json:"cover_image_url,omitempty"` // Signed URL (not stored in DB)
	Author        string          `bson:"author,omitempty" json:"author,omitempty"`
	Artist        string          `bson:"artist,omitempty" json:"artist,omitempty"`
	Status        SeriesStatus    `bson:"status" json:"status"`
	TagIDs        []bson.ObjectID `bson:"tag_ids" json:"-"`
	Tags          []Tag           `bson:"-" json:"tags,omitempty"`
	ViewCount     int64           `bson:"view_count" json:"view_count"`
	ChapterCount  int             `bson:"chapter_count" json:"chapter_count"`
	CreatedAt     time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time       `bson:"updated_at" json:"updated_at"`
}

type Chapter struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	Number    float64       `bson:"number" json:"number"`
	Title     string        `bson:"title,omitempty" json:"title,omitempty"`
	PageCount int           `bson:"page_count" json:"page_count"`
	ViewCount int64         `bson:"view_count" json:"view_count"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
}

type Page struct {
	ID             bson.ObjectID `bson:"_id,omitempty" json:"id"`
	ChapterID      bson.ObjectID `bson:"chapter_id" json:"chapter_id"`
	Number         int           `bson:"number" json:"number"`
	ImageURL       string        `bson:"image_url" json:"image_url"`
	ImageURLSigned string        `bson:"-" json:"image_url_signed,omitempty"` // Signed URL (not stored in DB)
	CreatedAt      time.Time     `bson:"created_at" json:"created_at"`
}

type Bookmark struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"user_id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}

type CreateTagRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=50"`
	Description string `json:"description" validate:"omitempty,max=500"`
}

type UpdateTagRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=50"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=500"`
}

type CreateSeriesRequest struct {
	Title       string   `json:"title" validate:"required,min=1,max=255"`
	Description string   `json:"description" validate:"omitempty,max=5000"`
	CoverImage  string   `json:"cover_image" validate:"omitempty"`
	Author      string   `json:"author" validate:"omitempty,max=255"`
	Artist      string   `json:"artist" validate:"omitempty,max=255"`
	Status      string   `json:"status" validate:"required,oneof=ongoing completed hiatus cancelled"`
	TagIDs      []string `json:"tag_ids" validate:"omitempty,dive,mongodb"`
}

type UpdateSeriesRequest struct {
	Title       *string  `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string  `json:"description,omitempty" validate:"omitempty,max=5000"`
	CoverImage  *string  `json:"cover_image,omitempty" validate:"omitempty"`
	Author      *string  `json:"author,omitempty" validate:"omitempty,max=255"`
	Artist      *string  `json:"artist,omitempty" validate:"omitempty,max=255"`
	Status      *string  `json:"status,omitempty" validate:"omitempty,oneof=ongoing completed hiatus cancelled"`
	TagIDs      []string `json:"tag_ids,omitempty" validate:"omitempty,dive,mongodb"`
}

type ListSeriesRequest struct {
	Page   int    `json:"page" validate:"omitempty,min=1"`
	Limit  int    `json:"limit" validate:"omitempty,min=1,max=100"`
	Status string `json:"status" validate:"omitempty,oneof=ongoing completed hiatus cancelled"`
	Search string `json:"search" validate:"omitempty,max=255"`
	SortBy string `json:"sort_by" validate:"omitempty,oneof=title created_at updated_at view_count chapter_count"`
	Order  string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type PaginatedResponse[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"total_pages"`
}

type CreateChapterRequest struct {
	Number float64 `json:"number" validate:"required,gt=0"`
	Title  string  `json:"title" validate:"omitempty,max=255"`
}

type UpdateChapterRequest struct {
	Number *float64 `json:"number,omitempty" validate:"omitempty,gt=0"`
	Title  *string  `json:"title,omitempty" validate:"omitempty,max=255"`
}

type ChapterWithPages struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	Number    float64       `bson:"number" json:"number"`
	Title     string        `bson:"title,omitempty" json:"title,omitempty"`
	PageCount int           `bson:"page_count" json:"page_count"`
	ViewCount int64         `bson:"view_count" json:"view_count"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
	Pages     []Page        `json:"pages,omitempty"`
}

type CreatePagesRequest struct {
	Pages []CreatePageItem `json:"pages" validate:"required,min=1,dive"`
}

type CreatePageItem struct {
	Number   int    `json:"number" validate:"required,min=1"`
	ImageURL string `json:"image_url" validate:"required"` // Filename only (e.g., "uuid.webp")
}

type UpdatePageRequest struct {
	Number *int `json:"number,omitempty" validate:"omitempty,min=1"`
}

type ReorderPagesRequest struct {
	PageOrders []PageOrder `json:"page_orders" validate:"required,min=1,dive"`
}

type PageOrder struct {
	PageID string `json:"page_id" validate:"required,mongodb"`
	Number int    `json:"number" validate:"required,min=1"`
}

type UploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

// AsyncUploadResponse is returned when an upload is queued for processing
type AsyncUploadResponse struct {
	UploadID string `json:"upload_id"`
	Status   string `json:"status"`
}

// AsyncBulkUploadResponse is returned when multiple uploads are queued
type AsyncBulkUploadResponse struct {
	Uploads []AsyncUploadResponse `json:"uploads"`
	Failed  []string              `json:"failed,omitempty"`
}

// UploadStatusResponse is returned when checking upload status
type UploadStatusResponse struct {
	UploadID string `json:"upload_id"`
	Status   string `json:"status"`
	Filename string `json:"filename,omitempty"`
	Error    string `json:"error,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	Size     int64  `json:"size,omitempty"`
}

type BulkUploadResponse struct {
	Uploads []UploadResponse `json:"uploads"`
	Failed  []string         `json:"failed,omitempty"`
}

type SeriesWithChapters struct {
	Series   Series    `json:"series"`
	Chapters []Chapter `json:"chapters"`
}

type ChapterNav struct {
	ID     string  `json:"id"`
	Number float64 `json:"number"`
	Title  string  `json:"title,omitempty"`
}

type ChapterReader struct {
	Chapter       Chapter     `json:"chapter"`
	SeriesSlug    string      `json:"series_slug"`
	SeriesTitle   string      `json:"series_title"`
	TotalChapters int         `json:"total_chapters"`
	Pages         []Page      `json:"pages"`
	PrevChapter   *ChapterNav `json:"prev_chapter,omitempty"`
	NextChapter   *ChapterNav `json:"next_chapter,omitempty"`
}

// DashboardStats provides aggregate statistics for the admin dashboard
type DashboardStats struct {
	// Core counts
	TotalUsers    int64 `json:"total_users"`
	TotalSeries   int64 `json:"total_series"`
	TotalChapters int64 `json:"total_chapters"`
	TotalViews    int64 `json:"total_views"`

	// User breakdown
	VerifiedUsers int64 `json:"verified_users"`
	BannedUsers   int64 `json:"banned_users"`

	// Series by status for pie chart
	SeriesByStatus map[string]int64 `json:"series_by_status"`

	// Time-series data for charts (last 7 days)
	UserRegistrations []DailyCount `json:"user_registrations"`
	ChapterUploads    []DailyCount `json:"chapter_uploads"`

	// Top content
	TopSeriesByViews []SeriesViewCount `json:"top_series_by_views"`

	// Recent activity
	RecentSeries []Series `json:"recent_series"`
	RecentUsers  []User   `json:"recent_users"`
}

// DailyCount represents a count for a specific date
type DailyCount struct {
	Date  string `json:"date"` // YYYY-MM-DD format
	Count int64  `json:"count"`
}

// SeriesViewCount represents a series with its view count for ranking
type SeriesViewCount struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	ViewCount int64  `json:"view_count"`
}

// SiteSettings stores all configurable site settings
// There should only be one document in the settings collection
type SiteSettings struct {
	ID           bson.ObjectID      `bson:"_id,omitempty" json:"id"`
	Site         SiteConfig         `bson:"site" json:"site"`
	Content      ContentConfig      `bson:"content" json:"content"`
	Users        UserConfig         `bson:"users" json:"users"`
	Integrations IntegrationsConfig `bson:"integrations" json:"integrations"`
	Maintenance  MaintenanceConfig  `bson:"maintenance" json:"maintenance"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

// SiteConfig contains general site configuration
type SiteConfig struct {
	Name            string `bson:"name" json:"name"`
	Description     string `bson:"description" json:"description"`
	LogoURL         string `bson:"logo_url" json:"logo_url"`
	FaviconURL      string `bson:"favicon_url" json:"favicon_url"`
	DefaultLocale   string `bson:"default_locale" json:"default_locale"`
	MetaTitle       string `bson:"meta_title" json:"meta_title"`
	MetaDescription string `bson:"meta_description" json:"meta_description"`
}

// ContentConfig contains content-related settings
type ContentConfig struct {
	MaxUploadSizeMB      int    `bson:"max_upload_size_mb" json:"max_upload_size_mb"`
	MaxChaptersPerDay    int    `bson:"max_chapters_per_day" json:"max_chapters_per_day"`
	AllowedImageTypes    string `bson:"allowed_image_types" json:"allowed_image_types"` // Comma-separated: jpg,png,webp
	DefaultContentRating string `bson:"default_content_rating" json:"default_content_rating"`
	EnableComments       bool   `bson:"enable_comments" json:"enable_comments"`
	RequireModeration    bool   `bson:"require_moderation" json:"require_moderation"`
}

// UserConfig contains user-related settings
type UserConfig struct {
	RegistrationOpen         bool   `bson:"registration_open" json:"registration_open"`
	RequireEmailVerification bool   `bson:"require_email_verification" json:"require_email_verification"`
	DefaultRoleID            string `bson:"default_role_id" json:"default_role_id"`
	AllowUsernameChange      bool   `bson:"allow_username_change" json:"allow_username_change"`
	MinPasswordLength        int    `bson:"min_password_length" json:"min_password_length"`
	MaxLoginAttempts         int    `bson:"max_login_attempts" json:"max_login_attempts"`
}

// IntegrationsConfig contains external service configurations
type IntegrationsConfig struct {
	SMTPHost      string `bson:"smtp_host" json:"smtp_host"`
	SMTPPort      int    `bson:"smtp_port" json:"smtp_port"`
	SMTPUsername  string `bson:"smtp_username" json:"smtp_username"`
	SMTPPassword  string `bson:"smtp_password" json:"-"` // Never expose in API
	SMTPFromEmail string `bson:"smtp_from_email" json:"smtp_from_email"`
	SMTPFromName  string `bson:"smtp_from_name" json:"smtp_from_name"`
	SMTPEnabled   bool   `bson:"smtp_enabled" json:"smtp_enabled"`
	CDNEnabled    bool   `bson:"cdn_enabled" json:"cdn_enabled"`
	CDNBaseURL    string `bson:"cdn_base_url" json:"cdn_base_url"`
}

// MaintenanceConfig contains maintenance mode settings
type MaintenanceConfig struct {
	Enabled        bool       `bson:"enabled" json:"enabled"`
	Message        string     `bson:"message" json:"message"`
	AllowedIPs     string     `bson:"allowed_ips" json:"allowed_ips"` // Comma-separated IPs
	ScheduledStart *time.Time `bson:"scheduled_start,omitempty" json:"scheduled_start,omitempty"`
	ScheduledEnd   *time.Time `bson:"scheduled_end,omitempty" json:"scheduled_end,omitempty"`
}

// UpdateSiteSettingsRequest is the request body for updating site settings
type UpdateSiteSettingsRequest struct {
	Site         *SiteConfig                `json:"site,omitempty"`
	Content      *ContentConfig             `json:"content,omitempty"`
	Users        *UserConfig                `json:"users,omitempty"`
	Integrations *UpdateIntegrationsRequest `json:"integrations,omitempty"`
	Maintenance  *MaintenanceConfig         `json:"maintenance,omitempty"`
}

// UpdateIntegrationsRequest allows partial SMTP password updates
type UpdateIntegrationsRequest struct {
	SMTPHost      *string `json:"smtp_host,omitempty"`
	SMTPPort      *int    `json:"smtp_port,omitempty"`
	SMTPUsername  *string `json:"smtp_username,omitempty"`
	SMTPPassword  *string `json:"smtp_password,omitempty"` // Only set if changing
	SMTPFromEmail *string `json:"smtp_from_email,omitempty"`
	SMTPFromName  *string `json:"smtp_from_name,omitempty"`
	SMTPEnabled   *bool   `json:"smtp_enabled,omitempty"`
	CDNEnabled    *bool   `json:"cdn_enabled,omitempty"`
	CDNBaseURL    *string `json:"cdn_base_url,omitempty"`
}

// MaintenanceAction represents actions that can be performed
type MaintenanceAction struct {
	Action string `json:"action" validate:"required,oneof=clear_cache clear_sessions test_email"`
}

// MaintenanceActionResponse is the response for maintenance actions
type MaintenanceActionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// CacheStats provides information about cache usage
type CacheStats struct {
	RedisConnected bool   `json:"redis_connected"`
	KeyCount       int64  `json:"key_count"`
	MemoryUsage    string `json:"memory_usage"`
}

// SystemInfo provides system status information
type SystemInfo struct {
	Version        string     `json:"version"`
	GoVersion      string     `json:"go_version"`
	Uptime         string     `json:"uptime"`
	DatabaseStatus string     `json:"database_status"`
	CacheStats     CacheStats `json:"cache_stats"`
}
