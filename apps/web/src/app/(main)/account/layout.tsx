import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSessionQueryOptions } from "@docix/api";
import {
	getQueryClient,
	getRequestHeaders,
	HydrateClient,
} from "@/lib/tanstack-query/server";
import { AccountSidebar } from "./_components/account-sidebar";
export default async function Layout({ children }: { children: ReactNode }) {
	const queryClient = getQueryClient();

	const session = await queryClient.fetchQuery(
		getCurrentSessionQueryOptions({
			headers: await getRequestHeaders(),
		}),
	);

	if (!session) {
		redirect("/auth/sign-in");
	}

	return (
		<HydrateClient>
			<div className="flex flex-col lg:flex-row gap-8">
				<AccountSidebar />
				<main className="flex-1 min-w-0">{children}</main>
			</div>
		</HydrateClient>
	);
}
