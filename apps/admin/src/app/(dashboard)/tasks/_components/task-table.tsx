"use client";

import type { TaskInfo, TaskState } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@docix/ui/components/dropdown-menu";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@docix/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@docix/ui/components/tabs";
import {
	Archive02Icon,
	Delete02Icon,
	MoreVerticalIcon,
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
	adminArchiveTask,
	adminDeleteTask,
	adminListTasksQueryOptions,
	adminRunTask,
	queryKeys,
} from "@/lib/api";

interface TaskTableProps {
	queueName: string;
}

const TASK_STATES: { value: TaskState; label: string }[] = [
	{ value: "pending", label: "Pending" },
	{ value: "active", label: "Active" },
	{ value: "scheduled", label: "Scheduled" },
	{ value: "retry", label: "Retry" },
	{ value: "archived", label: "Archived" },
	{ value: "completed", label: "Completed" },
];

export function TaskTable({ queueName }: TaskTableProps) {
	const [state, setState] = useState<TaskState>("pending");
	const [page, setPage] = useState(1);
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery(
		adminListTasksQueryOptions(queueName, {
			state,
			page: String(page),
		}),
	);

	const runMutation = useMutation({
		mutationFn: ({ taskId }: { taskId: string }) =>
			adminRunTask(queueName, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminTasks(queueName, {
					state,
					page: String(page),
				}),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const archiveMutation = useMutation({
		mutationFn: ({ taskId }: { taskId: string }) =>
			adminArchiveTask(queueName, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminTasks(queueName, {
					state,
					page: String(page),
				}),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: ({ taskId }: { taskId: string }) =>
			adminDeleteTask(queueName, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminTasks(queueName, {
					state,
					page: String(page),
				}),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const getStateBadgeVariant = (
		taskState: TaskState,
	): "default" | "secondary" | "destructive" | "outline" => {
		switch (taskState) {
			case "active":
				return "default";
			case "pending":
				return "secondary";
			case "retry":
			case "archived":
				return "destructive";
			case "completed":
				return "outline";
			default:
				return "secondary";
		}
	};

	return (
		<div className="space-y-4">
			<Tabs
				value={state}
				onValueChange={(v) => {
					setState(v as TaskState);
					setPage(1);
				}}
			>
				<TabsList>
					{TASK_STATES.map((s) => (
						<TabsTrigger key={s.value} value={s.value}>
							{s.label}
						</TabsTrigger>
					))}
				</TabsList>

				{TASK_STATES.map((s) => (
					<TabsContent key={s.value} value={s.value}>
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<Spinner className="h-6 w-6" />
							</div>
						) : !data?.tasks.length ? (
							<div className="py-8 text-center text-muted-foreground">
								No {s.label.toLowerCase()} tasks
							</div>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>ID</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>State</TableHead>
											<TableHead>Retried</TableHead>
											<TableHead>Created</TableHead>
											<TableHead className="w-[50px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.tasks.map((task) => (
											<TaskRow
												key={task.id}
												task={task}
												onRun={() => runMutation.mutate({ taskId: task.id })}
												onArchive={() =>
													archiveMutation.mutate({ taskId: task.id })
												}
												onDelete={() =>
													deleteMutation.mutate({ taskId: task.id })
												}
												isLoading={
													runMutation.isPending ||
													archiveMutation.isPending ||
													deleteMutation.isPending
												}
												getStateBadgeVariant={getStateBadgeVariant}
											/>
										))}
									</TableBody>
								</Table>

								<div className="flex items-center justify-between pt-4">
									<p className="text-sm text-muted-foreground">
										Showing {data.tasks.length} of {data.total_count} tasks
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={page === 1}
											onClick={() => setPage((p) => p - 1)}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={
												data.tasks.length < data.page_size ||
												page * data.page_size >= data.total_count
											}
											onClick={() => setPage((p) => p + 1)}
										>
											Next
										</Button>
									</div>
								</div>
							</>
						)}
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}

interface TaskRowProps {
	task: TaskInfo;
	onRun: () => void;
	onArchive: () => void;
	onDelete: () => void;
	isLoading: boolean;
	getStateBadgeVariant: (
		state: TaskState,
	) => "default" | "secondary" | "destructive" | "outline";
}

function TaskRow({
	task,
	onRun,
	onArchive,
	onDelete,
	isLoading,
	getStateBadgeVariant,
}: TaskRowProps) {
	const canRun =
		task.state === "scheduled" ||
		task.state === "retry" ||
		task.state === "archived";
	const canArchive = task.state === "pending" || task.state === "scheduled";

	return (
		<TableRow>
			<TableCell className="font-mono text-xs">
				{task.id.slice(0, 8)}...
			</TableCell>
			<TableCell>{task.type}</TableCell>
			<TableCell>
				<Badge variant={getStateBadgeVariant(task.state)}>{task.state}</Badge>
			</TableCell>
			<TableCell>
				{task.retried}/{task.max_retry}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{task.next_process_at
					? formatDistanceToNow(new Date(task.next_process_at), {
							addSuffix: true,
						})
					: "-"}
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button variant="ghost" size="icon" disabled={isLoading}>
								{isLoading ? (
									<Spinner className="h-4 w-4" />
								) : (
									<HugeiconsIcon icon={MoreVerticalIcon} className="h-4 w-4" />
								)}
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						{canRun && (
							<DropdownMenuItem onClick={onRun}>
								<HugeiconsIcon icon={PlayIcon} className="mr-2 h-4 w-4" />
								Run Now
							</DropdownMenuItem>
						)}
						{canArchive && (
							<DropdownMenuItem onClick={onArchive}>
								<HugeiconsIcon icon={Archive02Icon} className="mr-2 h-4 w-4" />
								Archive
							</DropdownMenuItem>
						)}
						<DropdownMenuItem onClick={onDelete} className="text-destructive">
							<HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}
