"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function TaskStatsCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Task Management</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>
					Manage and monitor worker tasks in the background queue.
				</CardDescription>
				<div className="space-y-4">
					<div className="text-sm text-gray-600">
						<strong>Available Endpoints:</strong>
					</div>
					<ul className="text-sm space-y-1 ml-4 list-disc">
						<li>
							GET /admin/tasks - List all tasks (requires asynq Inspector
							implementation)
						</li>
						<li>
							GET /admin/tasks/queues - List all queues (requires asynq
							Inspector implementation)
						</li>
						<li>DELETE /admin/upload/cleanup - Enqueue orphan cleanup task</li>
					</ul>
				</div>
				<div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
					<p className="text-sm text-blue-800 font-medium">
						ℹ️ Full task management requires asynq Inspector integration. Visit{" "}
						<a
							href="https://github.com/hibiken/asynq"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 underline hover:text-blue-700"
						>
							asynq documentation
						</a>{" "}
						for implementation details.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
