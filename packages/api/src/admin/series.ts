import type {
	Chapter,
	ChapterWithPages,
	CreateChapterRequest,
	CreatePagesRequest,
	CreateSeriesRequest,
	MessageResponse,
	Page,
	PaginatedResponse,
	ReorderPagesRequest,
	Series,
	UpdateChapterRequest,
	UpdatePageRequest,
	UpdateSeriesRequest,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";
import type { AdminListSeriesParams } from "../params";

// Query Options

export const adminListSeriesQueryOptions = (
	params?: AdminListSeriesParams,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminSeries(params),
		queryFn: async () => {
			const { data } = await api.get<PaginatedResponse<Series>>(
				"/admin/series",
				{ ...config, params },
			);
			return data;
		},
	});

export const adminGetSeriesQueryOptions = (
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminSeriesDetail(id),
		queryFn: async () => {
			const { data } = await api.get<Series>(`/admin/series/${id}`, config);
			return data;
		},
		enabled: !!id,
	});

export const adminListChaptersQueryOptions = (
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminChapters(id),
		queryFn: async () => {
			const { data } = await api.get<Chapter[]>(
				`/admin/series/${id}/chapters`,
				config,
			);
			return data;
		},
		enabled: !!id,
	});

export const adminGetChapterQueryOptions = (
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminChapterDetail(id),
		queryFn: async () => {
			const { data } = await api.get<ChapterWithPages>(
				`/admin/chapters/${id}`,
				config,
			);
			return data;
		},
		enabled: !!id,
	});

// Mutation Functions - Series

export const adminCreateSeries = async (
	request: CreateSeriesRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<Series>("/admin/series", request, config);
	return data;
};

export const adminUpdateSeries = async (
	id: string,
	request: UpdateSeriesRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<Series>(
		`/admin/series/${id}`,
		request,
		config,
	);
	return data;
};

export const adminDeleteSeries = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/series/${id}`,
		config,
	);
	return data;
};

// Mutation Functions - Chapters

export const adminCreateChapter = async (
	id: string,
	request: CreateChapterRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<Chapter>(
		`/admin/series/${id}/chapters`,
		request,
		config,
	);
	return data;
};

export const adminUpdateChapter = async (
	id: string,
	request: UpdateChapterRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<MessageResponse>(
		`/admin/chapters/${id}`,
		request,
		config,
	);
	return data;
};

export const adminDeleteChapter = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/chapters/${id}`,
		config,
	);
	return data;
};

// Mutation Functions - Pages

export const adminAddPages = async (
	id: string,
	request: CreatePagesRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<Page[]>(
		`/admin/chapters/${id}/pages`,
		request,
		config,
	);
	return data;
};

export const adminReorderPages = async (
	id: string,
	request: ReorderPagesRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/chapters/${id}/pages/reorder`,
		request,
		config,
	);
	return data;
};

export const adminUpdatePage = async (
	id: string,
	request: UpdatePageRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<MessageResponse>(
		`/admin/pages/${id}`,
		request,
		config,
	);
	return data;
};

export const adminDeletePage = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/pages/${id}`,
		config,
	);
	return data;
};

// Mutation Options - Series

export const adminCreateSeriesMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: CreateSeriesRequest) =>
			adminCreateSeries(request, config),
	});

export const adminUpdateSeriesMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & UpdateSeriesRequest) =>
			adminUpdateSeries(id, request, config),
	});

export const adminDeleteSeriesMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (id: string) => adminDeleteSeries(id, config),
	});

// Mutation Options - Chapters

export const adminCreateChapterMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & CreateChapterRequest) =>
			adminCreateChapter(id, request, config),
	});

export const adminUpdateChapterMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & UpdateChapterRequest) =>
			adminUpdateChapter(id, request, config),
	});

export const adminDeleteChapterMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (id: string) => adminDeleteChapter(id, config),
	});

// Mutation Options - Pages

export const adminAddPagesMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & CreatePagesRequest) =>
			adminAddPages(id, request, config),
	});

export const adminReorderPagesMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & ReorderPagesRequest) =>
			adminReorderPages(id, request, config),
	});

export const adminUpdatePageMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & UpdatePageRequest) =>
			adminUpdatePage(id, request, config),
	});

export const adminDeletePageMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (id: string) => adminDeletePage(id, config),
	});
