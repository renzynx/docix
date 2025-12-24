package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/rbac"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/session"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB           *database.Database
	RBAC         *rbac.Service
	SessionStore session.Store
}

func NewAuthHandler(db *database.Database, rbacService *rbac.Service, sessionStore session.Store) *AuthHandler {
	return &AuthHandler{
		DB:           db,
		RBAC:         rbacService,
		SessionStore: sessionStore,
	}
}

func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
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

	var user models.User
	err := h.DB.Users.FindOne(r.Context(), bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			response.Error(w, http.StatusUnauthorized, "Invalid email or password")
			return
		}
		log.Error("Failed to find user: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to sign in")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

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

	err = h.SessionStore.Delete(r.Context(), claims.SessionID)
	if err != nil {
		log.Error("Failed to delete session: ", err)
	}

	auth.ClearSessionCookie(w)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Signed out successfully",
	})
}

func (h *AuthHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sess := middleware.GetSessionFromContext(r.Context())

	sessions, err := h.SessionStore.ListByUserID(r.Context(), sess.UserID)
	if err != nil {
		log.Error("Failed to find sessions: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to list sessions")
		return
	}

	var items []models.SessionListItem
	for _, s := range sessions {
		items = append(items, models.SessionListItem{
			ID:        s.ID,
			IPAddress: s.IPAddress,
			UserAgent: s.UserAgent,
			ExpiresAt: s.ExpiresAt,
			CreatedAt: s.CreatedAt,
			IsCurrent: s.ID == sess.ID,
		})
	}

	response.JSON(w, http.StatusOK, items)
}

func (h *AuthHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	sess := middleware.GetSessionFromContext(r.Context())

	req, ok := validator.HandleRequest[models.RevokeSessionRequest](w, r)
	if !ok {
		return
	}

	deleted, err := h.SessionStore.DeleteByUserAndID(r.Context(), sess.UserID, req.SessionID)
	if err != nil {
		log.Error("Failed to revoke session: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to revoke session")
		return
	}

	if !deleted {
		response.Error(w, http.StatusNotFound, "Session not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Session revoked successfully",
	})
}

func (h *AuthHandler) GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	sess := middleware.GetSessionFromContext(r.Context())
	user := middleware.GetUserFromContext(r.Context())

	// If no session/user (using OptionalAuth middleware), return null
	if sess == nil || user == nil {
		response.JSON(w, http.StatusOK, nil)
		return
	}

	// Get user permissions and roles
	var permissions []string
	var roleNames []string

	if h.RBAC != nil {
		perms, err := h.RBAC.GetUserPermissions(r.Context(), user)
		if err == nil {
			permissions = perms
		}

		roles, err := h.RBAC.GetUserRoles(r.Context(), user)
		if err == nil {
			for _, role := range roles {
				roleNames = append(roleNames, role.Name)
			}
		}
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"session": models.SessionListItem{
			ID:        sess.ID,
			IPAddress: sess.IPAddress,
			UserAgent: sess.UserAgent,
			ExpiresAt: sess.ExpiresAt,
			CreatedAt: sess.CreatedAt,
			IsCurrent: true,
		},
		"user":        user,
		"permissions": permissions,
		"roles":       roleNames,
	})
}

func (h *AuthHandler) createSession(r *http.Request, userID string) (*session.Session, string, error) {
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days

	sess, err := h.SessionStore.Create(r.Context(), session.CreateParams{
		UserID:    userID,
		IPAddress: auth.GetClientIP(r),
		UserAgent: r.UserAgent(),
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return nil, "", err
	}

	jwtToken, err := auth.GenerateSessionToken(sess.ID, userID, expiresAt)
	if err != nil {
		return nil, "", err
	}

	return sess, jwtToken, nil
}

func (h *AuthHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())

	req, ok := validator.HandleRequest[models.UpdateUserRequest](w, r)
	if !ok {
		return
	}

	updates := bson.M{}
	resp := map[string]any{
		"message": "User updated successfully",
	}

	if req.Username != nil {
		username := strings.TrimSpace(*req.Username)
		if username != "" {
			updates["username"] = username
		} else {
			// Allow clearing username by setting to empty
			updates["username"] = ""
		}
	}

	if req.Email != nil {
		newEmail := strings.ToLower(strings.TrimSpace(*req.Email))

		if newEmail != user.Email {
			// Check if email is already taken
			count, err := h.DB.Users.CountDocuments(r.Context(), bson.M{"email": newEmail})
			if err != nil {
				log.Error("Failed to check email: ", err)
				response.Error(w, http.StatusInternalServerError, "Failed to update user")
				return
			}
			if count > 0 {
				response.Error(w, http.StatusConflict, "Email already in use")
				return
			}

			// If user is verified, they need to verify the new email first
			if user.VerifiedAt != nil {
				token, err := auth.GenerateEmailVerificationToken(
					user.ID.Hex(),
					newEmail,
					"change",
					24*time.Hour,
				)
				if err != nil {
					log.Error("Failed to generate verification token: ", err)
					response.Error(w, http.StatusInternalServerError, "Failed to generate verification token")
					return
				}
				resp["email_verification_required"] = true
				resp["email_verification_token"] = token
				resp["message"] = "Email change requires verification. Use the provided token to confirm."
			} else {
				// Unverified users can change email directly
				updates["email"] = newEmail
			}
		}
	}

	// Apply updates if any
	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		_, err := h.DB.Users.UpdateOne(r.Context(), bson.M{"_id": user.ID}, bson.M{"$set": updates})
		if err != nil {
			if mongo.IsDuplicateKeyError(err) {
				response.Error(w, http.StatusConflict, "Username already taken")
				return
			}
			log.Error("Failed to update user: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to update user")
			return
		}
	}

	response.JSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) RequestEmailVerification(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())

	if user.VerifiedAt != nil {
		response.Error(w, http.StatusBadRequest, "Email is already verified")
		return
	}

	token, err := auth.GenerateEmailVerificationToken(
		user.ID.Hex(),
		user.Email,
		"verify",
		24*time.Hour,
	)
	if err != nil {
		log.Error("Failed to generate verification token: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to generate verification token")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Verification token generated",
		"token":   token,
	})
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	req, ok := validator.HandleRequest[models.VerifyEmailRequest](w, r)
	if !ok {
		return
	}

	// Verify the token
	payload, err := auth.VerifyEmailVerificationToken(req.Token)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid or expired token")
		return
	}

	userID, err := bson.ObjectIDFromHex(payload.UserID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid token")
		return
	}

	var user models.User
	err = h.DB.Users.FindOne(r.Context(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		response.Error(w, http.StatusNotFound, "User not found")
		return
	}

	now := time.Now()

	switch payload.Purpose {
	case "verify":
		// First-time email verification
		if user.Email != payload.Email {
			response.Error(w, http.StatusBadRequest, "Email has been changed since token was generated")
			return
		}

		if user.VerifiedAt != nil {
			response.Error(w, http.StatusBadRequest, "Email is already verified")
			return
		}

		// Mark as verified
		_, err = h.DB.Users.UpdateOne(r.Context(), bson.M{"_id": userID}, bson.M{
			"$set": bson.M{
				"verified_at": now,
				"updated_at":  now,
			},
		})
		if err != nil {
			log.Error("Failed to verify email: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to verify email")
			return
		}

		response.JSON(w, http.StatusOK, map[string]string{
			"message": "Email verified successfully",
		})

	case "change":
		// Email change confirmation
		// Check if email is still available
		count, err := h.DB.Users.CountDocuments(r.Context(), bson.M{"email": payload.Email})
		if err != nil {
			log.Error("Failed to check email: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to confirm email change")
			return
		}
		if count > 0 {
			response.Error(w, http.StatusConflict, "Email already in use")
			return
		}

		// Update the email and re-verify
		_, err = h.DB.Users.UpdateOne(r.Context(), bson.M{"_id": userID}, bson.M{
			"$set": bson.M{
				"email":       payload.Email,
				"verified_at": now,
				"updated_at":  now,
			},
		})
		if err != nil {
			log.Error("Failed to update email: ", err)
			response.Error(w, http.StatusInternalServerError, "Failed to confirm email change")
			return
		}

		response.JSON(w, http.StatusOK, map[string]string{
			"message": "Email changed successfully",
		})

	default:
		response.Error(w, http.StatusBadRequest, "Invalid token type")
	}
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())

	req, ok := validator.HandleRequest[models.ChangePasswordRequest](w, r)
	if !ok {
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		response.Error(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Prevent setting the same password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.NewPassword)); err == nil {
		response.Error(w, http.StatusBadRequest, "New password must be different from current password")
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Error("Failed to hash password: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to change password")
		return
	}

	// Update password in database
	_, err = h.DB.Users.UpdateOne(r.Context(), bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"password":   string(hashedPassword),
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		log.Error("Failed to update password: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to change password")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}
