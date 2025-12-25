package models

type SignUpRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Username string `json:"username" validate:"omitempty,username"`
}

type SignInRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type CurrentSessionResponse struct {
	Session     SessionListItem `json:"session"`
	User        User            `json:"user"`
	Permissions []string        `json:"permissions"`
	Roles       []string        `json:"roles"`
}

type UserPermissionsResponse struct {
	Permissions []string `json:"permissions"`
	Roles       []string `json:"roles"`
}

type UpdateUserResponse struct {
	Message                   string `json:"message"`
	EmailVerificationRequired bool   `json:"email_verification_required,omitempty"`
	EmailVerificationToken    string `json:"email_verification_token,omitempty"`
}

type RequestVerificationResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
}

type HealthResponse struct {
	Status string `json:"status"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type RevokeSessionRequest struct {
	SessionID string `json:"session_id" validate:"required"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=1,max=50"`
	DisplayName string   `json:"display_name" validate:"omitempty,max=100"`
	Description string   `json:"description" validate:"omitempty,max=500"`
	Color       string   `json:"color" validate:"omitempty,hexcolor"`
	Priority    int      `json:"priority" validate:"gte=0"`
	Permissions []string `json:"permissions"`
}

type UpdateRoleRequest struct {
	DisplayName *string  `json:"display_name,omitempty" validate:"omitempty,max=100"`
	Description *string  `json:"description,omitempty" validate:"omitempty,max=500"`
	Color       *string  `json:"color,omitempty" validate:"omitempty,hexcolor"`
	Priority    *int     `json:"priority,omitempty" validate:"omitempty,gte=0"`
	Permissions []string `json:"permissions,omitempty"`
}

type AssignRoleRequest struct {
	UserID string `json:"user_id" validate:"required"`
	RoleID string `json:"role_id" validate:"required"`
}

type BanUserRequest struct {
	UserID string `json:"user_id" validate:"required"`
	Reason string `json:"reason" validate:"omitempty,max=500"`
}

type UpdateUserRequest struct {
	Email    *string `json:"email,omitempty" validate:"omitempty,email"`
	Username *string `json:"username,omitempty" validate:"omitempty,username"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

type BookmarkStatusResponse struct {
	Bookmarked bool   `json:"bookmarked"`
	BookmarkID string `json:"bookmark_id,omitempty"`
}

type ToggleBookmarkResponse struct {
	Bookmarked bool   `json:"bookmarked"`
	BookmarkID string `json:"bookmark_id,omitempty"`
	Message    string `json:"message"`
}
