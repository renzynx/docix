package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/packages/go/redis"
	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB               *database.Database
	RBAC             *rbac.Service
	Redis            *goredis.Client
	Settings         SettingsProvider
	LoginRateLimiter LoginRateLimiter
}

// This avoids import cycles with the settings package
type SettingsProvider interface {
	IsRegistrationOpen(ctx context.Context) bool
	RequiresEmailVerification(ctx context.Context) bool
	GetMaxLoginAttempts(ctx context.Context) int
}

// LoginRateLimiter interface for recording failed login attempts
type LoginRateLimiter interface {
	RecordFailedAttempt(ctx context.Context, ip string) error
	ClearAttempts(ctx context.Context, ip string) error
}

func NewAuthHandler(db *database.Database, rbacService *rbac.Service, settings SettingsProvider) *AuthHandler {
	return &AuthHandler{
		DB:       db,
		RBAC:     rbacService,
		Redis:    redis.MustGetClient(),
		Settings: settings,
	}
}

func (h *AuthHandler) SetLoginRateLimiter(lrl LoginRateLimiter) {
	h.LoginRateLimiter = lrl
}

func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	if !h.Settings.IsRegistrationOpen(r.Context()) {
		response.Error(w, http.StatusForbidden, "Registration is currently closed")
		return
	}

	req, ok := validator.HandleRequest[models.SignUpRequest](w, r)
	if !ok {
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Error("Failed to hash password: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	now := time.Now()
	user := models.User{
		Email:     req.Email,
		Username:  strings.TrimSpace(req.Username),
		Password:  string(hashedPassword),
		RoleIDs:   []bson.ObjectID{},
		CreatedAt: now,
		UpdatedAt: now,
	}

	_, err = h.DB.Users.InsertOne(r.Context(), user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			response.Error(w, http.StatusConflict, "Email already registered")
			return
		}
		log.Error("Failed to create user: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "Account created successfully",
	})
}

func (h *AuthHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	req, ok := validator.HandleRequest[models.SignInRequest](w, r)
	if !ok {
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	clientIP := getClientIP(r)

	var user models.User
	err := h.DB.Users.FindOne(r.Context(), bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			h.recordFailedLogin(r.Context(), clientIP)
			response.Error(w, http.StatusUnauthorized, "Invalid email or password")
			return
		}
		log.Error("Failed to find user: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to sign in")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		h.recordFailedLogin(r.Context(), clientIP)
		response.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if h.Settings.RequiresEmailVerification(r.Context()) && user.VerifiedAt == nil {
		response.Error(w, http.StatusForbidden, "Please verify your email before signing in")
		return
	}

	if user.IsBanned {
		response.Error(w, http.StatusForbidden, "Your account has been suspended")
		return
	}

	// Clear failed attempts on successful login
	h.clearFailedLogin(r.Context(), clientIP)

	sess, jwtToken, err := h.createSession(r, user.ID.Hex())
	if err != nil {
		log.Error("Failed to create session: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	auth.SetSessionCookie(w, jwtToken, sess.ExpiresAt)

	response.JSON(w, http.StatusOK, models.AuthResponse{
		Message: "Signed in successfully",
	})
}

func (h *AuthHandler) recordFailedLogin(ctx context.Context, ip string) {
	if h.LoginRateLimiter != nil {
		if err := h.LoginRateLimiter.RecordFailedAttempt(ctx, ip); err != nil {
			log.Warnf("Failed to record failed login attempt: %v", err)
		}
	}
}

func (h *AuthHandler) clearFailedLogin(ctx context.Context, ip string) {
	if h.LoginRateLimiter != nil {
		if err := h.LoginRateLimiter.ClearAttempts(ctx, ip); err != nil {
			log.Warnf("Failed to clear login attempts: %v", err)
		}
	}
}

func getClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	ip := r.RemoteAddr
	if colonIndex := strings.LastIndex(ip, ":"); colonIndex != -1 {
		ip = ip[:colonIndex]
	}
	return ip
}

func (h *AuthHandler) SignOut(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(constants.SessionCookieName)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "No session found")
		return
	}

	claims, err := auth.VerifySessionToken(cookie.Value)
	if err != nil {
		auth.ClearSessionCookie(w)
		response.Error(w, http.StatusBadRequest, "Invalid session token")
		return
	}

	sess, _ := h.getSession(r.Context(), claims.SessionID)
	if sess != nil {
		h.deleteSession(r.Context(), sess.ID, sess.UserID)
	}

	auth.ClearSessionCookie(w)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Signed out successfully",
	})
}
