"use client";

import { adminGetStatsQueryOptions } from "@docix/api";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@docix/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QueueCard, ServerList, TaskTable } from "./_components";

export default function TasksPage() {
	const [selectedQueue, setSelectedQueue] = useState<string | null>(null);

	const { data: stats, isLoading } = useQuery(adminGetStatsQueryOptions());

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">Failed to load task stats</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
				<p className="text-muted-foreground">
					Monitor and manage background tasks and queues.
				</p>
			</div>

			<Tabs defaultValue="queues" className="space-y-6">
				<TabsList>
					<TabsTrigger value="queues">Queues</TabsTrigger>
					<TabsTrigger value="workers">Workers</TabsTrigger>
				</TabsList>

				<TabsContent value="queues" className="space-y-6">
					{stats.queues.length === 0 ? (
						<Card>
							<CardContent className="py-8 text-center text-muted-foreground">
								No queues found. Tasks will appear here once the worker
								processes them.
							</CardContent>
						</Card>
					) : (
						<>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{stats.queues.map((queue) => (
									<QueueCard
										key={queue.name}
										queue={queue}
										onSelect={setSelectedQueue}
										isSelected={selectedQueue === queue.name}
									/>
								))}
							</div>

							{selectedQueue && (
								<Card>
									<CardHeader>
										<CardTitle>Tasks in "{selectedQueue}"</CardTitle>
										<CardDescription>
											View and manage tasks in this queue
										</CardDescription>
									</CardHeader>
									<CardContent>
										<TaskTable queueName={selectedQueue} />
									</CardContent>
								</Card>
							)}
						</>
					)}
				</TabsContent>

				<TabsContent value="workers">
					<Card>
						<CardHeader>
							<CardTitle>Active Workers</CardTitle>
							<CardDescription>
								Workers currently processing tasks
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ServerList />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
