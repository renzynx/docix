package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type SiteSettings struct {
	ID           bson.ObjectID      `bson:"_id,omitempty" json:"id"`
	Site         SiteConfig         `bson:"site" json:"site"`
	Content      ContentConfig      `bson:"content" json:"content"`
	Users        UserConfig         `bson:"users" json:"users"`
	Integrations IntegrationsConfig `bson:"integrations" json:"integrations"`
	Maintenance  MaintenanceConfig  `bson:"maintenance" json:"maintenance"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

type SiteConfig struct {
	Name            string `bson:"name" json:"name"`
	Description     string `bson:"description" json:"description"`
	LogoURL         string `bson:"logo_url" json:"logo_url"`
	FaviconURL      string `bson:"favicon_url" json:"favicon_url"`
	DefaultLocale   string `bson:"default_locale" json:"default_locale"`
	MetaTitle       string `bson:"meta_title" json:"meta_title"`
	MetaDescription string `bson:"meta_description" json:"meta_description"`
}

type ContentConfig struct {
	MaxUploadSizeMB      int    `bson:"max_upload_size_mb" json:"max_upload_size_mb"`
	MaxChaptersPerDay    int    `bson:"max_chapters_per_day" json:"max_chapters_per_day"`
	AllowedImageTypes    string `bson:"allowed_image_types" json:"allowed_image_types"`
	DefaultContentRating string `bson:"default_content_rating" json:"default_content_rating"`
	EnableComments       bool   `bson:"enable_comments" json:"enable_comments"`
	RequireModeration    bool   `bson:"require_moderation" json:"require_moderation"`
}

type UserConfig struct {
	RegistrationOpen         bool   `bson:"registration_open" json:"registration_open"`
	RequireEmailVerification bool   `bson:"require_email_verification" json:"require_email_verification"`
	DefaultRoleID            string `bson:"default_role_id" json:"default_role_id"`
	AllowUsernameChange      bool   `bson:"allow_username_change" json:"allow_username_change"`
	MaxLoginAttempts         int    `bson:"max_login_attempts" json:"max_login_attempts"`
}

type IntegrationsConfig struct {
	SMTPHost      string `bson:"smtp_host" json:"smtp_host"`
	SMTPPort      int    `bson:"smtp_port" json:"smtp_port"`
	SMTPUsername  string `bson:"smtp_username" json:"smtp_username"`
	SMTPPassword  string `bson:"smtp_password" json:"-"`
	SMTPFromEmail string `bson:"smtp_from_email" json:"smtp_from_email"`
	SMTPFromName  string `bson:"smtp_from_name" json:"smtp_from_name"`
	SMTPEnabled   bool   `bson:"smtp_enabled" json:"smtp_enabled"`
	CDNEnabled    bool   `bson:"cdn_enabled" json:"cdn_enabled"`
	CDNBaseURL    string `bson:"cdn_base_url" json:"cdn_base_url"`
}

type MaintenanceConfig struct {
	Enabled        bool       `bson:"enabled" json:"enabled"`
	Message        string     `bson:"message" json:"message"`
	AllowedIPs     string     `bson:"allowed_ips" json:"allowed_ips"`
	ScheduledStart *time.Time `bson:"scheduled_start,omitempty" json:"scheduled_start,omitempty"`
	ScheduledEnd   *time.Time `bson:"scheduled_end,omitempty" json:"scheduled_end,omitempty"`
}

type UpdateSiteSettingsRequest struct {
	Site         *SiteConfig                `json:"site,omitempty"`
	Content      *ContentConfig             `json:"content,omitempty"`
	Users        *UserConfig                `json:"users,omitempty"`
	Integrations *UpdateIntegrationsRequest `json:"integrations,omitempty"`
	Maintenance  *MaintenanceConfig         `json:"maintenance,omitempty"`
}

type UpdateIntegrationsRequest struct {
	SMTPHost      *string `json:"smtp_host,omitempty"`
	SMTPPort      *int    `json:"smtp_port,omitempty"`
	SMTPUsername  *string `json:"smtp_username,omitempty"`
	SMTPPassword  *string `json:"smtp_password,omitempty"`
	SMTPFromEmail *string `json:"smtp_from_email,omitempty"`
	SMTPFromName  *string `json:"smtp_from_name,omitempty"`
	SMTPEnabled   *bool   `json:"smtp_enabled,omitempty"`
	CDNEnabled    *bool   `json:"cdn_enabled,omitempty"`
	CDNBaseURL    *string `json:"cdn_base_url,omitempty"`
}

type MaintenanceAction struct {
	Action string `json:"action" validate:"required,oneof=clear_cache clear_sessions test_email"`
}

type MaintenanceActionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type CacheStats struct {
	RedisConnected bool   `json:"redis_connected"`
	KeyCount       int64  `json:"key_count"`
	MemoryUsage    string `json:"memory_usage"`
}

type SystemInfo struct {
	Version        string     `json:"version"`
	GoVersion      string     `json:"go_version"`
	Uptime         string     `json:"uptime"`
	DatabaseStatus string     `json:"database_status"`
	CacheStats     CacheStats `json:"cache_stats"`
}

type PublicSiteConfig struct {
	Name            string                 `json:"name"`
	Description     string                 `json:"description"`
	LogoURL         string                 `json:"logo_url"`
	FaviconURL      string                 `json:"favicon_url"`
	DefaultLocale   string                 `json:"default_locale"`
	MetaTitle       string                 `json:"meta_title"`
	MetaDescription string                 `json:"meta_description"`
	Maintenance     *PublicMaintenanceInfo `json:"maintenance,omitempty"`
}

type PublicMaintenanceInfo struct {
	Enabled bool   `json:"enabled"`
	Message string `json:"message"`
}
