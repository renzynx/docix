import {
	getCurrentSessionQueryOptions,
	getUserPermissionsQueryOptions,
} from "@docix/api";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { type AdminSession, hasAdminAccess } from "@/lib/auth";
import {
	getQueryClient,
	getRequestHeaders,
	HydrateClient,
} from "@/lib/tanstack-query/server";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = getQueryClient();
	const headers = await getRequestHeaders();

	// Prefetch session and permissions in parallel
	const [sessionData, permissionsData] = await Promise.all([
		queryClient.fetchQuery(getCurrentSessionQueryOptions({ headers })),
		queryClient.fetchQuery(getUserPermissionsQueryOptions({ headers })),
	]);

	if (!sessionData?.user || !permissionsData) {
		redirect("/auth/sign-in");
	}

	const { permissions, roles } = permissionsData;

	if (!hasAdminAccess(roles, permissions)) {
		redirect("/auth/forbidden");
	}

	const session: AdminSession = {
		user: {
			id: sessionData.user.id,
			email: sessionData.user.email,
			username: sessionData.user.username,
		},
		permissions,
		roles,
	};

	return (
		<HydrateClient>
			<AuthProvider session={session}>
				<DashboardShell>{children}</DashboardShell>
			</AuthProvider>
		</HydrateClient>
	);
}
