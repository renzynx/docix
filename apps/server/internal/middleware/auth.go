package middleware

import (
	"context"
	"net/http"

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
)

func Auth(db *database.Database) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(constants.SessionCookieName)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Not authenticated")
				return
			}

			// Verify JWT and extract session claims
			claims, err := auth.VerifySessionToken(cookie.Value)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session token")
				return
			}

			sessionID, err := bson.ObjectIDFromHex(claims.SessionID)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session token")
				return
			}

			var session models.Session
			err = db.Sessions.FindOne(r.Context(), bson.M{"_id": sessionID}).Decode(&session)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "Invalid session")
				return
			}

			var user models.User
			err = db.Users.FindOne(r.Context(), bson.M{"_id": session.UserID}).Decode(&user)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "User not found")
				return
			}

			if user.IsBanned {
				response.Error(w, http.StatusForbidden, "Account is banned")
				return
			}

			ctx := context.WithValue(r.Context(), SessionContextKey, &session)
			ctx = context.WithValue(ctx, UserContextKey, &user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(db *database.Database) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(constants.SessionCookieName)
			if err != nil {
				// No cookie, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			// Verify JWT and extract session claims
			claims, err := auth.VerifySessionToken(cookie.Value)
			if err != nil {
				// Invalid token, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			sessionID, err := bson.ObjectIDFromHex(claims.SessionID)
			if err != nil {
				// Invalid session ID, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			var session models.Session
			err = db.Sessions.FindOne(r.Context(), bson.M{"_id": sessionID}).Decode(&session)
			if err != nil {
				// Session not found, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			var user models.User
			err = db.Users.FindOne(r.Context(), bson.M{"_id": session.UserID}).Decode(&user)
			if err != nil {
				// User not found, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			if user.IsBanned {
				// Banned user, continue without auth
				next.ServeHTTP(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), SessionContextKey, &session)
			ctx = context.WithValue(ctx, UserContextKey, &user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
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

func GetSessionFromContext(ctx context.Context) *models.Session {
	session, _ := ctx.Value(SessionContextKey).(*models.Session)
	return session
}
