package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/response"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type contextKey string

const (
	UserContextKey    contextKey = "user"
	SessionContextKey contextKey = "session"
	RBACContextKey    contextKey = "rbac"
	sessionKeyPrefix             = "session:"
)

// Session represents a user session stored in Redis.
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

func Auth(db *database.Database) func(http.Handler) http.Handler {
	redisClient := redis.MustGetClient()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(constants.SessionCookieName)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			claims, err := auth.VerifySessionToken(cookie.Value)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session token")
				return
			}

			// Get session from Redis
			sess, err := getSession(r.Context(), redisClient, claims.SessionID)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "Session lookup failed")
				return
			}
			if sess == nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session")
				return
			}

			// Get user from database
			userID, err := bson.ObjectIDFromHex(sess.UserID)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session")
				return
			}

			var user models.User
			err = db.Users.FindOne(r.Context(), bson.M{"_id": userID}).Decode(&user)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "User not found")
				return
			}

			if user.IsBanned {
				response.Error(w, http.StatusForbidden, "Account is banned")
				return
			}

			ctx := context.WithValue(r.Context(), SessionContextKey, sess)
			ctx = context.WithValue(ctx, UserContextKey, &user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(db *database.Database) func(http.Handler) http.Handler {
	redisClient := redis.MustGetClient()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(constants.SessionCookieName)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			claims, err := auth.VerifySessionToken(cookie.Value)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			sess, err := getSession(r.Context(), redisClient, claims.SessionID)
			if err != nil || sess == nil {
				next.ServeHTTP(w, r)
				return
			}

			userID, err := bson.ObjectIDFromHex(sess.UserID)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			var user models.User
			err = db.Users.FindOne(r.Context(), bson.M{"_id": userID}).Decode(&user)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			if user.IsBanned {
				next.ServeHTTP(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), SessionContextKey, sess)
			ctx = context.WithValue(ctx, UserContextKey, &user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func getSession(ctx context.Context, client *goredis.Client, id string) (*Session, error) {
	data, err := client.Get(ctx, sessionKeyPrefix+id).Bytes()
	if err != nil {
		if err == goredis.Nil {
			return nil, nil
		}
		return nil, err
	}

	var sess Session
	if err := json.Unmarshal(data, &sess); err != nil {
		return nil, err
	}
	return &sess, nil
}

func RequirePermission(rbacService *rbac.Service, permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			hasPermission, err := rbacService.UserHasPermission(r.Context(), user, permission)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
				return
			}

			if !hasPermission {
				response.Error(w, http.StatusForbidden, "Insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireAnyPermission(rbacService *rbac.Service, permissions ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			hasPermission, err := rbacService.UserHasAnyPermission(r.Context(), user, permissions...)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
				return
			}

			if !hasPermission {
				response.Error(w, http.StatusForbidden, "Insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireAllPermissions(rbacService *rbac.Service, permissions ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			hasPermission, err := rbacService.UserHasAllPermissions(r.Context(), user, permissions...)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "Failed to check permissions")
				return
			}

			if !hasPermission {
				response.Error(w, http.StatusForbidden, "Insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireRole(rbacService *rbac.Service, roleName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			hasRole, err := rbacService.UserHasRole(r.Context(), user, roleName)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "Failed to check role")
				return
			}

			if !hasRole {
				response.Error(w, http.StatusForbidden, "Role required: "+roleName)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserFromContext(ctx context.Context) *models.User {
	user, _ := ctx.Value(UserContextKey).(*models.User)
	return user
}

func GetSessionFromContext(ctx context.Context) *Session {
	sess, _ := ctx.Value(SessionContextKey).(*Session)
	return sess
}
