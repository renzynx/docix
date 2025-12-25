package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID         bson.ObjectID   `bson:"_id,omitempty" json:"id"`
	Email      string          `bson:"email" json:"email"`
	Password   string          `bson:"password" json:"-"`
	Username   string          `bson:"username,omitempty" json:"username,omitempty"`
	Avatar     string          `bson:"avatar,omitempty" json:"avatar,omitempty"`
	RoleIDs    []bson.ObjectID `bson:"role_ids" json:"-"`
	Roles      []Role          `bson:"-" json:"roles,omitempty"`
	VerifiedAt *time.Time      `bson:"verified_at,omitempty" json:"verified_at,omitempty"`
	IsBanned   bool            `bson:"is_banned" json:"is_banned"`
	BanReason  string          `bson:"ban_reason,omitempty" json:"ban_reason,omitempty"`
	BannedAt   *time.Time      `bson:"banned_at,omitempty" json:"banned_at,omitempty"`
	CreatedAt  time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time       `bson:"updated_at" json:"updated_at"`
}

type Session struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"user_id"`
	IPAddress string        `bson:"ip_address" json:"ip_address"`
	UserAgent string        `bson:"user_agent" json:"user_agent"`
	ExpiresAt time.Time     `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}

type Role struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string        `bson:"name" json:"name"`
	DisplayName string        `bson:"display_name" json:"display_name"`
	Description string        `bson:"description" json:"description"`
	Color       string        `bson:"color" json:"color"`
	Priority    int           `bson:"priority" json:"priority"`
	Permissions []string      `bson:"permissions" json:"permissions"`
	IsSystem    bool          `bson:"is_system" json:"is_system"`
	CreatedAt   time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
}

type SessionListItem struct {
	ID        string    `json:"id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	IsCurrent bool      `json:"is_current"`
}
