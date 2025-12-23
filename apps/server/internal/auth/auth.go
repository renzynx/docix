package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/renzynx/docix/server/internal/config"
	"github.com/renzynx/docix/server/internal/constants"
)

type SessionClaims struct {
	SessionID string `json:"sid"`
	UserID    string `json:"uid"`
	jwt.RegisteredClaims
}

func GenerateSessionToken(sessionID, userID string, expiresAt time.Time) (string, error) {
	cfg := config.Get()

	claims := SessionClaims{
		SessionID: sessionID,
		UserID:    userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.AuthSecret))
}

func VerifySessionToken(tokenString string) (*SessionClaims, error) {
	cfg := config.Get()

	token, err := jwt.ParseWithClaims(tokenString, &SessionClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(cfg.AuthSecret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*SessionClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func GetClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	addr := r.RemoteAddr
	if colonIndex := strings.LastIndex(addr, ":"); colonIndex != -1 {
		return addr[:colonIndex]
	}
	return addr
}

func SetSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	cfg := config.Get()

	sameSite := http.SameSiteLaxMode
	if cfg.UseSecureCookie {
		sameSite = http.SameSiteStrictMode
	}

	http.SetCookie(w, &http.Cookie{
		Name:     constants.SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   cfg.UseSecureCookie,
		SameSite: sameSite,
	})
}

func ClearSessionCookie(w http.ResponseWriter) {
	cfg := config.Get()

	sameSite := http.SameSiteLaxMode
	if cfg.UseSecureCookie {
		sameSite = http.SameSiteStrictMode
	}

	http.SetCookie(w, &http.Cookie{
		Name:     constants.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.UseSecureCookie,
		SameSite: sameSite,
	})
}

type EmailVerificationClaims struct {
	UserID  string `json:"user_id"`
	Email   string `json:"email"`
	Purpose string `json:"purpose"` // "verify" or "change"
	jwt.RegisteredClaims
}

func GenerateEmailVerificationToken(userID, email, purpose string, ttl time.Duration) (string, error) {
	cfg := config.Get()

	claims := EmailVerificationClaims{
		UserID:  userID,
		Email:   email,
		Purpose: purpose,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.AuthSecret))
}

func VerifyEmailVerificationToken(tokenString string) (*EmailVerificationClaims, error) {
	cfg := config.Get()

	token, err := jwt.ParseWithClaims(tokenString, &EmailVerificationClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(cfg.AuthSecret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*EmailVerificationClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
