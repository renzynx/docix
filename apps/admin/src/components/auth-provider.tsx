"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { AdminSession } from "@/lib/auth";

const AuthContext = createContext<AdminSession | null>(null);

interface AuthProviderProps {
	children: ReactNode;
	session: AdminSession;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
	return (
		<AuthContext.Provider value={session}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export function useOptionalAuth() {
	return useContext(AuthContext);
}
