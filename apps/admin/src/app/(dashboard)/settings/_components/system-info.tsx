"use client";

import { Badge } from "@docix/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Spinner } from "@docix/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { adminGetSystemInfoQueryOptions } from "@/lib/api";

export function SystemInfoCard() {
	const { data: info, isLoading } = useQuery(adminGetSystemInfoQueryOptions());

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>System Status</CardTitle>
					<CardDescription>Server and service status</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-8">
					<Spinner className="size-6" />
				</CardContent>
			</Card>
		);
	}

	if (!info) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>System Status</CardTitle>
					<CardDescription>Server and service status</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Failed to load system info</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>System Status</CardTitle>
				<CardDescription>Server and service status</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Version</span>
						<span className="font-mono text-sm">{info.version}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Go Version</span>
						<span className="font-mono text-sm">{info.go_version}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Uptime</span>
						<span className="text-sm">{info.uptime}</span>
					</div>
				</div>

				<div className="space-y-2 border-t pt-3">
					<span className="text-sm font-medium">Services</span>
					<div className="grid gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Database</span>
							<Badge
								variant={
									info.database_status === "connected"
										? "default"
										: "destructive"
								}
							>
								{info.database_status}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Redis</span>
							<Badge
								variant={
									info.cache_stats.redis_connected ? "default" : "destructive"
								}
							>
								{info.cache_stats.redis_connected
									? "connected"
									: "disconnected"}
							</Badge>
						</div>
					</div>
				</div>

				{info.cache_stats.redis_connected && (
					<div className="space-y-2 border-t pt-3">
						<span className="text-sm font-medium">Cache Stats</span>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Keys</span>
								<span className="font-mono text-sm">
									{info.cache_stats.key_count}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Memory</span>
								<span className="font-mono text-sm">
									{info.cache_stats.memory_usage}
								</span>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
