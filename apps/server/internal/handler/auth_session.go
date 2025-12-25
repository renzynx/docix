package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
	"github.com/renzynx/docix/server/internal/auth"
	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/middleware"
	"github.com/renzynx/docix/server/internal/models"
	"github.com/renzynx/docix/server/internal/response"
	"github.com/renzynx/docix/server/internal/validator"
	log "github.com/sirupsen/logrus"
)

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *AuthHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sess := middleware.GetSessionFromContext(r.Context())

	sessions, err := h.listUserSessions(r.Context(), sess.UserID)
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

	isMember, err := h.Redis.SIsMember(r.Context(), constants.UserSessionsKeyPrefix+sess.UserID, req.SessionID).Result()
	if err != nil || !isMember {
		response.Error(w, http.StatusNotFound, "Session not found")
		return
	}

	h.deleteSession(r.Context(), req.SessionID, sess.UserID)

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Session revoked successfully",
	})
}

func (h *AuthHandler) GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	sess := middleware.GetSessionFromContext(r.Context())
	user := middleware.GetUserFromContext(r.Context())

	if sess == nil || user == nil {
		response.JSON(w, http.StatusOK, nil)
		return
	}

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

func (h *AuthHandler) createSession(r *http.Request, userID string) (*Session, string, error) {
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	ttl := time.Until(expiresAt)

	sess := &Session{
		ID:        uuid.New().String(),
		UserID:    userID,
		IPAddress: auth.GetClientIP(r),
		UserAgent: r.UserAgent(),
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}

	data, err := json.Marshal(sess)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal session: %w", err)
	}

	ctx := r.Context()
	pipe := h.Redis.Pipeline()
	pipe.Set(ctx, constants.SessionKeyPrefix+sess.ID, data, ttl)
	pipe.SAdd(ctx, constants.UserSessionsKeyPrefix+userID, sess.ID)
	pipe.Expire(ctx, constants.UserSessionsKeyPrefix+userID, ttl+24*time.Hour)

	if _, err := pipe.Exec(ctx); err != nil {
		return nil, "", fmt.Errorf("failed to create session: %w", err)
	}

	jwtToken, err := auth.GenerateSessionToken(sess.ID, userID, expiresAt)
	if err != nil {
		return nil, "", err
	}

	return sess, jwtToken, nil
}

func (h *AuthHandler) getSession(ctx context.Context, id string) (*Session, error) {
	data, err := h.Redis.Get(ctx, constants.SessionKeyPrefix+id).Bytes()
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

func (h *AuthHandler) deleteSession(ctx context.Context, sessionID, userID string) {
	pipe := h.Redis.Pipeline()
	pipe.Del(ctx, constants.SessionKeyPrefix+sessionID)
	pipe.SRem(ctx, constants.UserSessionsKeyPrefix+userID, sessionID)
	pipe.Exec(ctx)
}

func (h *AuthHandler) listUserSessions(ctx context.Context, userID string) ([]Session, error) {
	sessionIDs, err := h.Redis.SMembers(ctx, constants.UserSessionsKeyPrefix+userID).Result()
	if err != nil || len(sessionIDs) == 0 {
		return nil, err
	}

	keys := make([]string, len(sessionIDs))
	for i, id := range sessionIDs {
		keys[i] = constants.SessionKeyPrefix + id
	}

	values, err := h.Redis.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	var sessions []Session
	var expiredIDs []string

	for i, val := range values {
		if val == nil {
			expiredIDs = append(expiredIDs, sessionIDs[i])
			continue
		}
		data, ok := val.(string)
		if !ok {
			continue
		}
		var sess Session
		if err := json.Unmarshal([]byte(data), &sess); err != nil {
			continue
		}
		sessions = append(sessions, sess)
	}

	if len(expiredIDs) > 0 {
		go func() {
			cleanupCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			h.Redis.SRem(cleanupCtx, constants.UserSessionsKeyPrefix+userID, expiredIDs)
		}()
	}

	return sessions, nil
}
