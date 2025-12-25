"use client";

import { getCurrentSessionQueryOptions } from "@docix/api";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

export function useSession() {
	return useQuery({
		...getCurrentSessionQueryOptions(),
		retry: 0,
	});
}

export function useSuspenseSession() {
	return useSuspenseQuery({
		...getCurrentSessionQueryOptions(),
		retry: 0,
	});
}
