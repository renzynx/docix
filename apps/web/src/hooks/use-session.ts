"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentSessionQueryOptions } from "@/lib/api.generated";

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
