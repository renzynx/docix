import type {
	DailyStats,
	DashboardStats,
	MessageResponse,
	QueueInfo,
	QueueListResponse,
	ServerInfo,
	TaskInfo,
	TaskListResponse,
	TaskStatsResponse,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";
import type { AdminGetHistoryParams, AdminListTasksParams } from "../params";

// Query Options

export const adminGetPermissionsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminPermissions,
		queryFn: async () => {
			const { data } = await api.get<string[]>("/admin/permissions", config);
			return data;
		},
	});

export const adminGetDashboardStatsQueryOptions = (
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminDashboardStats,
		queryFn: async () => {
			const { data } = await api.get<DashboardStats>("/admin/stats", config);
			return data;
		},
	});

export const adminGetStatsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminStats,
		queryFn: async () => {
			const { data } = await api.get<TaskStatsResponse>("/admin/tasks", config);
			return data;
		},
	});

export const adminListServersQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminServers,
		queryFn: async () => {
			const { data } = await api.get<{ servers: ServerInfo[] }>(
				"/admin/tasks/servers",
				config,
			);
			return data;
		},
	});

export const adminListQueuesQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminQueues,
		queryFn: async () => {
			const { data } = await api.get<QueueListResponse>(
				"/admin/tasks/queues",
				config,
			);
			return data;
		},
	});

export const adminGetQueueInfoQueryOptions = (
	name: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminQueueInfoDetail(name),
		queryFn: async () => {
			const { data } = await api.get<QueueInfo>(
				`/admin/tasks/queues/${name}`,
				config,
			);
			return data;
		},
		enabled: !!name,
	});

export const adminListTasksQueryOptions = (
	name: string,
	params?: AdminListTasksParams,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminTasks(name, params),
		queryFn: async () => {
			const { data } = await api.get<TaskListResponse>(
				`/admin/tasks/queues/${name}/tasks`,
				{ ...config, params },
			);
			return data;
		},
		enabled: !!name,
	});

export const adminGetHistoryQueryOptions = (
	name: string,
	params?: AdminGetHistoryParams,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminHistoryDetail(name, params),
		queryFn: async () => {
			const { data } = await api.get<{ history: DailyStats[] }>(
				`/admin/tasks/queues/${name}/history`,
				{ ...config, params },
			);
			return data;
		},
		enabled: !!name,
	});

export const adminGetTaskQueryOptions = (
	queue: string,
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminTaskDetail(queue),
		queryFn: async () => {
			const { data } = await api.get<TaskInfo>(
				`/admin/tasks/${queue}/${id}`,
				config,
			);
			return data;
		},
		enabled: !!queue,
	});

// Mutation Functions

export const adminPauseQueue = async (
	name: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/tasks/queues/${name}/pause`,
		undefined,
		config,
	);
	return data;
};

export const adminUnpauseQueue = async (
	name: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/tasks/queues/${name}/unpause`,
		undefined,
		config,
	);
	return data;
};

export const adminRunAllScheduledTasks = async (
	name: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<{ message: string; count: number }>(
		`/admin/tasks/queues/${name}/run-scheduled`,
		undefined,
		config,
	);
	return data;
};

export const adminRunAllRetryTasks = async (
	name: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<{ message: string; count: number }>(
		`/admin/tasks/queues/${name}/run-retry`,
		undefined,
		config,
	);
	return data;
};

export const adminDeleteAllArchivedTasks = async (
	name: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<{ message: string; count: number }>(
		`/admin/tasks/queues/${name}/archived`,
		config,
	);
	return data;
};

export const adminRunTask = async (
	queue: string,
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/tasks/${queue}/${id}/run`,
		undefined,
		config,
	);
	return data;
};

export const adminArchiveTask = async (
	queue: string,
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/tasks/${queue}/${id}/archive`,
		undefined,
		config,
	);
	return data;
};

export const adminDeleteTask = async (
	queue: string,
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/tasks/${queue}/${id}`,
		config,
	);
	return data;
};

// Mutation Options

export const adminPauseQueueMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (name: string) => adminPauseQueue(name, config),
	});

export const adminUnpauseQueueMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (name: string) => adminUnpauseQueue(name, config),
	});

export const adminRunAllScheduledTasksMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (name: string) => adminRunAllScheduledTasks(name, config),
	});

export const adminRunAllRetryTasksMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (name: string) => adminRunAllRetryTasks(name, config),
	});

export const adminDeleteAllArchivedTasksMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (name: string) => adminDeleteAllArchivedTasks(name, config),
	});

export const adminRunTaskMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ queue, id }: { queue: string; id: string }) =>
			adminRunTask(queue, id, config),
	});

export const adminArchiveTaskMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ queue, id }: { queue: string; id: string }) =>
			adminArchiveTask(queue, id, config),
	});

export const adminDeleteTaskMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ queue, id }: { queue: string; id: string }) =>
			adminDeleteTask(queue, id, config),
	});
