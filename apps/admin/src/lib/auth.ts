export interface AdminSession {
	user: {
		id: string;
		email: string;
		username?: string;
	};
	permissions: string[];
	roles: string[];
}

export function hasAdminAccess(
	roles: string[],
	permissions: string[],
): boolean {
	return (
		roles.includes("admin") ||
		permissions.some((p) => p.startsWith("admin:") || p === "*")
	);
}

export function hasSessionCookie(cookieHeader: string | null): boolean {
	if (!cookieHeader) return false;
	return cookieHeader.includes("docix_session=");
}
