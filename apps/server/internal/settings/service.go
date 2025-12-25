package settings

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
	redispkg "github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

const (
	// RedisKey is the key used to store settings in Redis
	RedisKey = "docix:settings"
)

// Service provides access to site settings with Redis caching
type Service struct {
	db    *database.Database
	redis *goredis.Client
	mu    sync.RWMutex
	// Local cache for when Redis is unavailable
	localCache *models.SiteSettings
}

// NewService creates a new settings service
func NewService(db *database.Database) *Service {
	redisClient, err := redispkg.GetClient()
	if err != nil {
		log.Warn("Redis not available for settings cache, using local cache only")
	}

	return &Service{
		db:    db,
		redis: redisClient,
	}
}

// Load loads settings from MongoDB and caches them in Redis
// Should be called on server startup
func (s *Service) Load(ctx context.Context) error {
	settings, err := s.getOrCreateFromDB(ctx)
	if err != nil {
		return err
	}

	// Update local cache
	s.mu.Lock()
	s.localCache = settings
	s.mu.Unlock()

	// Update Redis cache
	if s.redis != nil {
		if err := s.cacheToRedis(ctx, settings); err != nil {
			log.Warnf("Failed to cache settings to Redis: %v", err)
		}
	}

	log.Info("Settings loaded and cached successfully")
	return nil
}

// Get returns the current site settings
// Tries Redis first, falls back to local cache, then MongoDB
func (s *Service) Get(ctx context.Context) (*models.SiteSettings, error) {
	// Try Redis first
	if s.redis != nil {
		settings, err := s.getFromRedis(ctx)
		if err == nil && settings != nil {
			return settings, nil
		}
		if err != nil && err != goredis.Nil {
			log.Warnf("Redis cache read failed: %v", err)
		}
	}

	// Try local cache
	s.mu.RLock()
	if s.localCache != nil {
		cached := s.localCache
		s.mu.RUnlock()
		return cached, nil
	}
	s.mu.RUnlock()

	// Fall back to MongoDB and refresh cache
	settings, err := s.getOrCreateFromDB(ctx)
	if err != nil {
		return nil, err
	}

	// Update caches
	s.mu.Lock()
	s.localCache = settings
	s.mu.Unlock()

	if s.redis != nil {
		if err := s.cacheToRedis(ctx, settings); err != nil {
			log.Warnf("Failed to cache settings to Redis: %v", err)
		}
	}

	return settings, nil
}

// Update updates settings in MongoDB and refreshes the cache
func (s *Service) Update(ctx context.Context, updates bson.M) (*models.SiteSettings, error) {
	settings, err := s.getOrCreateFromDB(ctx)
	if err != nil {
		return nil, err
	}

	updates["updated_at"] = time.Now()

	_, err = s.db.SiteSettings.UpdateOne(ctx,
		bson.M{"_id": settings.ID},
		bson.M{"$set": updates},
	)
	if err != nil {
		return nil, err
	}

	// Reload settings to get updated values
	err = s.db.SiteSettings.FindOne(ctx, bson.M{"_id": settings.ID}).Decode(settings)
	if err != nil {
		return nil, err
	}

	// Update caches
	s.mu.Lock()
	s.localCache = settings
	s.mu.Unlock()

	if s.redis != nil {
		if err := s.cacheToRedis(ctx, settings); err != nil {
			log.Warnf("Failed to update settings cache in Redis: %v", err)
		}
	}

	log.Info("Settings updated and cache refreshed")
	return settings, nil
}

// InvalidateCache clears the settings cache (useful for maintenance)
func (s *Service) InvalidateCache(ctx context.Context) error {
	s.mu.Lock()
	s.localCache = nil
	s.mu.Unlock()

	if s.redis != nil {
		if err := s.redis.Del(ctx, RedisKey).Err(); err != nil {
			return err
		}
	}

	log.Info("Settings cache invalidated")
	return nil
}

// GetSiteConfig returns just the site configuration
func (s *Service) GetSiteConfig(ctx context.Context) (*models.SiteConfig, error) {
	settings, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	return &settings.Site, nil
}

// GetContentConfig returns just the content configuration
func (s *Service) GetContentConfig(ctx context.Context) (*models.ContentConfig, error) {
	settings, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	return &settings.Content, nil
}

// GetUserConfig returns just the user configuration
func (s *Service) GetUserConfig(ctx context.Context) (*models.UserConfig, error) {
	settings, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	return &settings.Users, nil
}

// GetIntegrationsConfig returns just the integrations configuration
func (s *Service) GetIntegrationsConfig(ctx context.Context) (*models.IntegrationsConfig, error) {
	settings, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	return &settings.Integrations, nil
}

// GetMaintenanceConfig returns just the maintenance configuration
func (s *Service) GetMaintenanceConfig(ctx context.Context) (*models.MaintenanceConfig, error) {
	settings, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	return &settings.Maintenance, nil
}

// IsMaintenanceMode checks if maintenance mode is enabled
// Returns enabled status, message, and allowed IPs (comma-separated string)
func (s *Service) IsMaintenanceMode(ctx context.Context) (bool, string, string) {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for maintenance check: %v", err)
		return false, "", ""
	}
	return settings.Maintenance.Enabled, settings.Maintenance.Message, settings.Maintenance.AllowedIPs
}

// IsRegistrationOpen checks if registration is open
func (s *Service) IsRegistrationOpen(ctx context.Context) bool {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for registration check: %v", err)
		return true // Default to open if settings unavailable
	}
	return settings.Users.RegistrationOpen
}

// RequiresEmailVerification checks if email verification is required
func (s *Service) RequiresEmailVerification(ctx context.Context) bool {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for email verification check: %v", err)
		return true // Default to required if settings unavailable
	}
	return settings.Users.RequireEmailVerification
}

// GetMaxUploadSizeMB returns the maximum upload size in MB
func (s *Service) GetMaxUploadSizeMB(ctx context.Context) int {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for upload size check: %v", err)
		return 10 // Default 10MB
	}
	return settings.Content.MaxUploadSizeMB
}

// GetAllowedImageTypes returns comma-separated list of allowed image types
func (s *Service) GetAllowedImageTypes(ctx context.Context) string {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for allowed image types: %v", err)
		return "jpg,jpeg,png,webp,gif" // Default allowed types
	}
	return settings.Content.AllowedImageTypes
}

// IsCDNEnabled checks if CDN is enabled for serving images
func (s *Service) IsCDNEnabled(ctx context.Context) bool {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for CDN check: %v", err)
		return true // Default to enabled if settings unavailable
	}
	return settings.Integrations.CDNEnabled
}

// GetCDNBaseURL returns the CDN base URL for serving images
func (s *Service) GetCDNBaseURL(ctx context.Context) string {
	settings, err := s.Get(ctx)
	if err != nil {
		log.Warnf("Failed to get settings for CDN base URL: %v", err)
		return "" // No default - fall back to config
	}
	return settings.Integrations.CDNBaseURL
}

// getOrCreateFromDB retrieves settings from MongoDB or creates defaults
func (s *Service) getOrCreateFromDB(ctx context.Context) (*models.SiteSettings, error) {
	var settings models.SiteSettings

	err := s.db.SiteSettings.FindOne(ctx, bson.M{}).Decode(&settings)
	if err == mongo.ErrNoDocuments {
		settings = s.defaultSettings()
		result, err := s.db.SiteSettings.InsertOne(ctx, settings)
		if err != nil {
			return nil, err
		}
		settings.ID = result.InsertedID.(bson.ObjectID)
		log.Info("Created default site settings")
		return &settings, nil
	}

	if err != nil {
		return nil, err
	}

	return &settings, nil
}

// defaultSettings returns the default site settings
func (s *Service) defaultSettings() models.SiteSettings {
	return models.SiteSettings{
		Site: models.SiteConfig{
			Name:            "Docix",
			Description:     "A manga reading platform",
			DefaultLocale:   "en",
			MetaTitle:       "Docix - Read Manga Online",
			MetaDescription: "Read your favorite manga online for free",
		},
		Content: models.ContentConfig{
			MaxUploadSizeMB:      10,
			MaxChaptersPerDay:    50,
			AllowedImageTypes:    "jpg,jpeg,png,webp,gif",
			DefaultContentRating: "everyone",
			EnableComments:       true,
			RequireModeration:    false,
		},
		Users: models.UserConfig{
			RegistrationOpen:         true,
			RequireEmailVerification: true,
			DefaultRoleID:            "",
			AllowUsernameChange:      true,
			MinPasswordLength:        8,
			MaxLoginAttempts:         5,
		},
		Integrations: models.IntegrationsConfig{
			SMTPPort:    587,
			SMTPEnabled: false,
			CDNEnabled:  true,
		},
		Maintenance: models.MaintenanceConfig{
			Enabled: false,
			Message: "We are currently performing maintenance. Please check back soon.",
		},
		UpdatedAt: time.Now(),
	}
}

// getFromRedis retrieves settings from Redis cache
func (s *Service) getFromRedis(ctx context.Context) (*models.SiteSettings, error) {
	data, err := s.redis.Get(ctx, RedisKey).Bytes()
	if err != nil {
		return nil, err
	}

	var settings models.SiteSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return nil, err
	}

	return &settings, nil
}

// cacheToRedis stores settings in Redis cache
func (s *Service) cacheToRedis(ctx context.Context, settings *models.SiteSettings) error {
	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	// No expiration - settings are invalidated on update
	return s.redis.Set(ctx, RedisKey, data, 0).Err()
}
