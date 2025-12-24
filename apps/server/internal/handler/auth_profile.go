package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

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
			updates["username"] = ""
		}
	}

	if req.Email != nil {
		newEmail := strings.ToLower(strings.TrimSpace(*req.Email))

		if newEmail != user.Email {
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
				updates["email"] = newEmail
			}
		}
	}

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
		if user.Email != payload.Email {
			response.Error(w, http.StatusBadRequest, "Email has been changed since token was generated")
			return
		}

		if user.VerifiedAt != nil {
			response.Error(w, http.StatusBadRequest, "Email is already verified")
			return
		}

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

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.NewPassword)); err == nil {
		response.Error(w, http.StatusBadRequest, "New password must be different from current password")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Error("Failed to hash password: ", err)
		response.Error(w, http.StatusInternalServerError, "Failed to change password")
		return
	}

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
