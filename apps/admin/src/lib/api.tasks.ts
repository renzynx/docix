import type {
	DailyStats,
	QueueInfo,
	QueueListResponse,
	ServerInfo,
	TaskInfo,
	TaskListResponse,
	TaskState,
	TaskStatsResponse,
} from "@docix/types";
import { queryOptions } from "@tanstack/react-query";
import { api } from "./api.generated";

export const taskQueryKeys = {
	stats: ["admin", "tasks", "stats"] as const,
	queues: ["admin", "tasks", "queues"] as const,
	queueDetail: (name: string) => ["admin", "tasks", "queues", name] as const,
	queueTasks: (name: string, state: TaskState, page: number) =>
		["admin", "tasks", "queues", name, "tasks", state, page] as const,
	queueHistory: (name: string, days: number) =>
		["admin", "tasks", "queues", name, "history", days] as const,
	taskDetail: (queue: string, id: string) =>
		["admin", "tasks", queue, id] as const,
	servers: ["admin", "tasks", "servers"] as const,
} as const;

export const getTaskStatsQueryOptions = () =>
	queryOptions({
		queryKey: taskQueryKeys.stats,
		queryFn: async () => {
			const { data } = await api.get<TaskStatsResponse>("/admin/tasks");
			return data;
		},
	});

export const listQueuesQueryOptions = () =>
	queryOptions({
		queryKey: taskQueryKeys.queues,
		queryFn: async () => {
			const { data } = await api.get<QueueListResponse>("/admin/tasks/queues");
			return data;
		},
	});

export const getQueueInfoQueryOptions = (name: string) =>
	queryOptions({
		queryKey: taskQueryKeys.queueDetail(name),
		queryFn: async () => {
			const { data } = await api.get<QueueInfo>(`/admin/tasks/queues/${name}`);
			return data;
		},
		enabled: !!name,
	});

export const listQueueTasksQueryOptions = (
	name: string,
	state: TaskState = "pending",
	page = 1,
	pageSize = 20,
) =>
	queryOptions({
		queryKey: taskQueryKeys.queueTasks(name, state, page),
		queryFn: async () => {
			const { data } = await api.get<TaskListResponse>(
				`/admin/tasks/queues/${name}/tasks`,
				{ params: { state, page, page_size: pageSize } },
			);
			return data;
		},
		enabled: !!name,
	});

export const getQueueHistoryQueryOptions = (name: string, days = 7) =>
	queryOptions({
		queryKey: taskQueryKeys.queueHistory(name, days),
		queryFn: async () => {
			const { data } = await api.get<{ history: DailyStats[] }>(
				`/admin/tasks/queues/${name}/history`,
				{ params: { days } },
			);
			return data.history;
		},
		enabled: !!name,
	});

export const getTaskDetailQueryOptions = (queue: string, id: string) =>
	queryOptions({
		queryKey: taskQueryKeys.taskDetail(queue, id),
		queryFn: async () => {
			const { data } = await api.get<TaskInfo>(`/admin/tasks/${queue}/${id}`);
			return data;
		},
		enabled: !!queue && !!id,
	});

export const listServersQueryOptions = () =>
	queryOptions({
		queryKey: taskQueryKeys.servers,
		queryFn: async () => {
			const { data } = await api.get<{ servers: ServerInfo[] }>(
				"/admin/tasks/servers",
			);
			return data.servers;
		},
	});

export const taskMutations = {
	runTask: async (queue: string, taskId: string) => {
		const { data } = await api.post(`/admin/tasks/${queue}/${taskId}/run`);
		return data;
	},
	archiveTask: async (queue: string, taskId: string) => {
		const { data } = await api.post(`/admin/tasks/${queue}/${taskId}/archive`);
		return data;
	},
	deleteTask: async (queue: string, taskId: string) => {
		const { data } = await api.delete(`/admin/tasks/${queue}/${taskId}`);
		return data;
	},
	pauseQueue: async (name: string) => {
		const { data } = await api.post(`/admin/tasks/queues/${name}/pause`);
		return data;
	},
	unpauseQueue: async (name: string) => {
		const { data } = await api.post(`/admin/tasks/queues/${name}/unpause`);
		return data;
	},
	runAllScheduledTasks: async (name: string) => {
		const { data } = await api.post(
			`/admin/tasks/queues/${name}/run-scheduled`,
		);
		return data;
	},
	runAllRetryTasks: async (name: string) => {
		const { data } = await api.post(`/admin/tasks/queues/${name}/run-retry`);
		return data;
	},
	deleteAllArchivedTasks: async (name: string) => {
		const { data } = await api.delete(`/admin/tasks/queues/${name}/archived`);
		return data;
	},
};
