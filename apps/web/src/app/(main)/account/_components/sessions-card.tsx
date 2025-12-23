"use client";

import type { SessionListItem } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Skeleton } from "@docix/ui/components/skeleton";
import {
	ComputerIcon,
	GlobalIcon,
	SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
	listSessionsQueryOptions,
	queryKeys,
	revokeSessionMutationOptions,
} from "@/lib/api.generated";

function getDeviceIcon(userAgent: string) {
	const ua = userAgent.toLowerCase();
	if (
		ua.includes("mobile") ||
		ua.includes("android") ||
		ua.includes("iphone")
	) {
		return <HugeiconsIcon icon={SmartPhone01Icon} className="size-4" />;
	}
	return <HugeiconsIcon icon={ComputerIcon} className="size-4" />;
}

function getBrowserInfo(userAgent: string): string {
	const ua = userAgent.toLowerCase();

	if (ua.includes("firefox")) return "Firefox";
	if (ua.includes("edg")) return "Edge";
	if (ua.includes("chrome")) return "Chrome";
	if (ua.includes("safari")) return "Safari";
	if (ua.includes("opera") || ua.includes("opr")) return "Opera";

	return "Unknown Browser";
}

function getOSInfo(userAgent: string): string {
	const ua = userAgent.toLowerCase();

	if (ua.includes("windows")) return "Windows";
	if (ua.includes("mac os") || ua.includes("macos")) return "macOS";
	if (ua.includes("linux")) return "Linux";
	if (ua.includes("android")) return "Android";
	if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";

	return "Unknown OS";
}

function SessionItem({
	session,
	onRevoke,
	isRevoking,
}: {
	session: SessionListItem;
	onRevoke: (sessionId: string) => void;
	isRevoking: boolean;
}) {
	const browser = getBrowserInfo(session.user_agent);
	const os = getOSInfo(session.user_agent);
	const createdAt = new Date(session.created_at);

	return (
		<div className="flex items-center justify-between gap-4 rounded-lg border p-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 text-muted-foreground">
					{getDeviceIcon(session.user_agent)}
				</div>
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-medium">
							{browser} on {os}
						</span>
						{session.is_current && <Badge variant="secondary">Current</Badge>}
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<HugeiconsIcon icon={GlobalIcon} className="size-3" />
						<span>{session.ip_address}</span>
						<span>•</span>
						<span>
							Active {formatDistanceToNow(createdAt, { addSuffix: true })}
						</span>
					</div>
				</div>
			</div>
			{!session.is_current && (
				<Button
					variant="destructive"
					size="sm"
					onClick={() => onRevoke(session.id)}
					isLoading={isRevoking}
				>
					Revoke
				</Button>
			)}
		</div>
	);
}

function SessionsSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="flex items-center justify-between rounded-lg border p-4"
				>
					<div className="flex items-start gap-3">
						<Skeleton className="size-4" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	);
}

export default function SessionsCard() {
	const queryClient = useQueryClient();

	const {
		data: sessions,
		isLoading,
		error,
	} = useQuery(listSessionsQueryOptions());

	const {
		mutate: revokeSession,
		isPending,
		variables,
	} = useMutation({
		...revokeSessionMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
		},
		onError: (err) => {
			if (err instanceof AxiosError) {
				toast.error(
					err.response?.data.message ||
						"An error occurred while revoking the session.",
				);
			} else {
				toast.error("An unexpected error occurred.");
			}
		},
	});

	const handleRevoke = (sessionId: string) => {
		revokeSession({ session_id: sessionId });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Active Sessions</CardTitle>
				<CardDescription>
					Manage your active sessions across all devices. You can revoke access
					to any session except your current one.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<SessionsSkeleton />
				) : error ? (
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
						Failed to load sessions. Please try again later.
					</div>
				) : sessions && sessions.length > 0 ? (
					<div className="space-y-3">
						{sessions.map((session) => (
							<SessionItem
								key={session.id}
								session={session}
								onRevoke={handleRevoke}
								isRevoking={isPending && variables?.session_id === session.id}
							/>
						))}
					</div>
				) : (
					<div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
						No active sessions found.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
