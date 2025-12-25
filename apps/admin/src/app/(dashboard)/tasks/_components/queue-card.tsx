"use client";

import type { QueueInfo } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@docix/ui/components/dropdown-menu";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Activity02Icon,
	Archive02Icon,
	CheckmarkCircle02Icon,
	Clock02Icon,
	Clock03Icon,
	MoreVerticalIcon,
	PauseIcon,
	PlayIcon,
	RefreshIcon,
	XVariableCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	adminDeleteAllArchivedTasks,
	adminPauseQueue,
	adminRunAllRetryTasks,
	adminRunAllScheduledTasks,
	adminUnpauseQueue,
	queryKeys,
} from "@/lib/api.generated";

interface QueueCardProps {
	queue: QueueInfo;
	onSelect: (name: string) => void;
	isSelected: boolean;
}

export function QueueCard({ queue, onSelect, isSelected }: QueueCardProps) {
	const queryClient = useQueryClient();

	const pauseMutation = useMutation({
		mutationFn: () => adminPauseQueue(queue.name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
			queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
		},
	});

	const unpauseMutation = useMutation({
		mutationFn: () => adminUnpauseQueue(queue.name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
			queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
		},
	});

	const runScheduledMutation = useMutation({
		mutationFn: () => adminRunAllScheduledTasks(queue.name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const runRetryMutation = useMutation({
		mutationFn: () => adminRunAllRetryTasks(queue.name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const deleteArchivedMutation = useMutation({
		mutationFn: () => adminDeleteAllArchivedTasks(queue.name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminQueues });
		},
	});

	const isLoading =
		pauseMutation.isPending ||
		unpauseMutation.isPending ||
		runScheduledMutation.isPending ||
		runRetryMutation.isPending ||
		deleteArchivedMutation.isPending;

	const totalTasks =
		queue.pending +
		queue.active +
		queue.scheduled +
		queue.retry +
		queue.archived;

	return (
		<Card
			className={`cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "border-primary" : ""}`}
			onClick={() => onSelect(queue.name)}
		>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CardTitle className="text-lg">{queue.name}</CardTitle>
						{queue.paused && (
							<Badge variant="secondary">
								<HugeiconsIcon icon={PauseIcon} className="mr-1 h-3 w-3" />
								Paused
							</Badge>
						)}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="ghost" size="icon" disabled={isLoading}>
									{isLoading ? (
										<Spinner className="h-4 w-4" />
									) : (
										<HugeiconsIcon
											icon={MoreVerticalIcon}
											className="h-4 w-4"
										/>
									)}
								</Button>
							}
							onClick={(e) => e.stopPropagation()}
						/>
						<DropdownMenuContent align="end">
							{queue.paused ? (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										unpauseMutation.mutate();
									}}
								>
									<HugeiconsIcon icon={PlayIcon} className="mr-2 h-4 w-4" />
									Resume Queue
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										pauseMutation.mutate();
									}}
								>
									<HugeiconsIcon icon={PauseIcon} className="mr-2 h-4 w-4" />
									Pause Queue
								</DropdownMenuItem>
							)}
							{queue.scheduled > 0 && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										runScheduledMutation.mutate();
									}}
								>
									<HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
									Run Scheduled ({queue.scheduled})
								</DropdownMenuItem>
							)}
							{queue.retry > 0 && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										runRetryMutation.mutate();
									}}
								>
									<HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
									Run Retry ({queue.retry})
								</DropdownMenuItem>
							)}
							{queue.archived > 0 && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										deleteArchivedMutation.mutate();
									}}
									className="text-destructive"
								>
									<HugeiconsIcon
										icon={XVariableCircleIcon}
										className="mr-2 h-4 w-4"
									/>
									Delete Archived ({queue.archived})
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<CardDescription>{totalTasks} total tasks</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-3 gap-2 text-sm">
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={Clock02Icon}
							className="h-3 w-3 text-yellow-500"
						/>
						<span className="text-muted-foreground">Pending:</span>
						<span className="font-medium">{queue.pending}</span>
					</div>
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={Activity02Icon}
							className="h-3 w-3 text-blue-500"
						/>
						<span className="text-muted-foreground">Active:</span>
						<span className="font-medium">{queue.active}</span>
					</div>
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={Clock03Icon}
							className="h-3 w-3 text-purple-500"
						/>
						<span className="text-muted-foreground">Scheduled:</span>
						<span className="font-medium">{queue.scheduled}</span>
					</div>
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={RefreshIcon}
							className="h-3 w-3 text-orange-500"
						/>
						<span className="text-muted-foreground">Retry:</span>
						<span className="font-medium">{queue.retry}</span>
					</div>
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={Archive02Icon}
							className="h-3 w-3 text-gray-500"
						/>
						<span className="text-muted-foreground">Archived:</span>
						<span className="font-medium">{queue.archived}</span>
					</div>
					<div className="flex items-center gap-1">
						<HugeiconsIcon
							icon={CheckmarkCircle02Icon}
							className="h-3 w-3 text-green-500"
						/>
						<span className="text-muted-foreground">Completed:</span>
						<span className="font-medium">{queue.completed}</span>
					</div>
				</div>
				<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
					<span>Processed: {queue.processed}</span>
					<span>Failed: {queue.failed}</span>
				</div>
			</CardContent>
		</Card>
	);
}
