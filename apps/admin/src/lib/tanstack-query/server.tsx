import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

export function HydrateClient(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{props.children}
		</HydrationBoundary>
	);
}

export async function getRequestHeaders() {
	const nextHeaders = await headers();
	const headerMap: Record<string, string> = {};

	nextHeaders.forEach((value, key) => {
		headerMap[key] = value;
	});

	return headerMap;
}
