"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { makeQueryClient } from "./query-client";

let browserQueryClient: QueryClient;

function getQueryClient() {
	if (typeof window === "undefined") {
		return makeQueryClient();
	}

	if (!browserQueryClient) browserQueryClient = makeQueryClient();
	return browserQueryClient;
}

export function TanstackQueryProvider({ children }: { children: ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
