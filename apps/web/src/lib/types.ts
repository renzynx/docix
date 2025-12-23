export interface SessionResponse {
	session: Session;
	user: User;
}

export interface Session {
	id: string;
	ip_address: string;
	user_agent: string;
	expires_at: Date;
	created_at: Date;
	is_current: boolean;
}

export interface User {
	id: string;
	email: string;
	username?: string;
	avatar?: string;
	is_banned: boolean;
	created_at: Date;
	updated_at: Date;
}

export interface AuthResponse {
	error?: string;
	message: string;
}
