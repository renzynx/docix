"use client";

import type { ServerInfo } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Spinner } from "@docix/ui/components/spinner";
import { ServerStack01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { adminListServersQueryOptions } from "@/lib/api";

export function ServerList() {
	const { data, isLoading } = useQuery(adminListServersQueryOptions());

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Spinner className="h-6 w-6" />
			</div>
		);
	}

	if (!data?.servers?.length) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No active workers
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{data.servers.map((server) => (
				<ServerCard key={`${server.host}-${server.pid}`} server={server} />
			))}
		</div>
	);
}

function ServerCard({ server }: { server: ServerInfo }) {
	const queueList = Object.entries(server.queues)
		.map(([name, priority]) => `${name}:${priority}`)
		.join(", ");

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<HugeiconsIcon icon={ServerStack01Icon} className="h-4 w-4" />
						<CardTitle className="text-base">{server.host}</CardTitle>
					</div>
					<Badge variant={server.status === "active" ? "default" : "secondary"}>
						{server.status}
					</Badge>
				</div>
				<CardDescription>
					PID: {server.pid} • Concurrency: {server.concurrency}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="text-sm">
					<span className="text-muted-foreground">Queues:</span>{" "}
					<span className="font-mono text-xs">{queueList}</span>
				</div>
				<div className="text-sm">
					<span className="text-muted-foreground">Started:</span>{" "}
					{formatDistanceToNow(new Date(server.started), { addSuffix: true })}
				</div>

				{server.active_workers.length > 0 && (
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Active Workers ({server.active_workers.length})
						</p>
						<div className="space-y-1">
							{server.active_workers.map((worker) => (
								<div
									key={worker.task_id}
									className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
								>
									<span className="font-mono">{worker.task_type}</span>
									<span className="text-muted-foreground">
										{formatDistanceToNow(new Date(worker.started_at), {
											addSuffix: true,
										})}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
