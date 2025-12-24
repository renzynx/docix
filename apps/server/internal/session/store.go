package session

import (
	"context"
	"time"
)

// Session represents a user session independent of storage backend.
// This allows switching between MongoDB, Redis, or other stores.
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateParams contains parameters for creating a new session.
type CreateParams struct {
	UserID    string
	IPAddress string
	UserAgent string
	ExpiresAt time.Time
}

// Store defines the interface for session storage backends.
// Implementations can use MongoDB, Redis, or any other storage.
type Store interface {
	// Create stores a new session and returns it with the generated ID.
	Create(ctx context.Context, params CreateParams) (*Session, error)

	// Get retrieves a session by its ID.
	// Returns nil, nil if the session does not exist.
	Get(ctx context.Context, id string) (*Session, error)

	// Delete removes a session by its ID.
	// Returns nil if the session doesn't exist (idempotent).
	Delete(ctx context.Context, id string) error

	// DeleteByUserAndID removes a session for a specific user.
	// Returns true if a session was deleted, false if not found.
	DeleteByUserAndID(ctx context.Context, userID, sessionID string) (bool, error)

	// ListByUserID returns all sessions for a given user.
	ListByUserID(ctx context.Context, userID string) ([]Session, error)

	// DeleteExpired removes all expired sessions (cleanup job).
	DeleteExpired(ctx context.Context) (int64, error)
}
