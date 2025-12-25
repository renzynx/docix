import type {
	AdminGetHistoryParams,
	AdminListSeriesParams,
	AdminListTasksParams,
	ListSeriesParams,
} from "./params";

export const queryKeys = {
	health: ["health"] as const,
	currentSession: ["auth", "session"] as const,
	sessions: ["auth", "sessions"] as const,
	userPermissions: ["auth", "permissions"] as const,
	bookmarks: ["bookmarks"] as const,
	bookmarkStatusDetail: (seriesId: string) =>
		["bookmarks", "bookmarkStatusDetail", seriesId] as const,
	series: (params?: ListSeriesParams) => ["manga", params] as const,
	seriesBySlugDetail: (slug: string) =>
		["manga", "seriesBySlugDetail", slug] as const,
	chapterDetail: (slug: string) =>
		["manga", "chapters", "chapterDetail", slug] as const,
	tags: ["tags"] as const,
	adminPermissions: ["admin", "permissions"] as const,
	adminDashboardStats: ["admin", "stats"] as const,
	adminStats: ["admin", "tasks"] as const,
	adminServers: ["admin", "tasks", "servers"] as const,
	adminQueues: ["admin", "tasks", "queues"] as const,
	adminQueueInfoDetail: (name: string) =>
		["admin", "tasks", "queues", "adminQueueInfoDetail", name] as const,
	adminTasks: (name: string, params?: AdminListTasksParams) =>
		["admin", "tasks", "queues", "tasks", "adminTasks", name, params] as const,
	adminHistoryDetail: (name: string, params?: AdminGetHistoryParams) =>
		[
			"admin",
			"tasks",
			"queues",
			"history",
			"adminHistoryDetail",
			name,
			params,
		] as const,
	adminTaskDetail: (queue: string) =>
		["admin", "tasks", "adminTaskDetail", queue] as const,
	adminUploadStatusDetail: (id: string) =>
		["admin", "upload", "status", "adminUploadStatusDetail", id] as const,
	adminRoles: ["admin", "roles"] as const,
	adminRoleDetail: (id: string) =>
		["admin", "roles", "adminRoleDetail", id] as const,
	adminUsers: ["admin", "users"] as const,
	adminTags: ["admin", "tags"] as const,
	adminSeries: (params?: AdminListSeriesParams) =>
		["admin", "series", params] as const,
	adminSeriesDetail: (id: string) =>
		["admin", "series", "adminSeriesDetail", id] as const,
	adminChapters: (id: string) =>
		["admin", "series", "chapters", "adminChapters", id] as const,
	adminChapterDetail: (id: string) =>
		["admin", "chapters", "adminChapterDetail", id] as const,
	adminSiteSettings: ["admin", "settings"] as const,
	adminSystemInfo: ["admin", "settings", "system"] as const,
} as const;
