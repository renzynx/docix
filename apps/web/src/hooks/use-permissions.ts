"use client";

import { useSession } from "./use-session";

export function usePermissions() {
	const { data: session, isPending, isError } = useSession();

	return {
		data: session
			? { permissions: session.permissions, roles: session.roles }
			: undefined,
		isPending,
		isError,
	};
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

export function useIsAdmin() {
	const { data: permissions, isPending } = usePermissions();

	const isAdmin = permissions
		? hasAdminAccess(permissions.roles, permissions.permissions)
		: false;

	return { isAdmin, isPending };
}
