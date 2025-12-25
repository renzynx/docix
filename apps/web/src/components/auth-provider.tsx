"use client";

import {
	getCurrentSessionQueryOptions,
	guestLogin,
	queryKeys,
} from "@docix/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	const guestLoginAttempted = useRef(false);

	const {
		data: session,
		isLoading,
		isError,
	} = useQuery({
		...getCurrentSessionQueryOptions(),
		retry: 0,
		staleTime: 5 * 60 * 1000,
	});

	useEffect(() => {
		if (isLoading || guestLoginAttempted.current) {
			return;
		}

		const shouldLoginAsGuest = !session || isError;

		if (shouldLoginAsGuest) {
			guestLoginAttempted.current = true;
			guestLogin()
				.then((guestSession) => {
					queryClient.setQueryData(queryKeys.currentSession, guestSession);
				})
				.catch((error) => {
					console.error("Failed to create guest session:", error);
				});
		}
	}, [session, isLoading, isError, queryClient]);

	return <>{children}</>;
}
