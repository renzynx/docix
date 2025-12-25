import type {
	Bookmark,
	BookmarkStatusResponse,
	ChapterReader,
	HealthResponse,
	MessageResponse,
	PaginatedResponse,
	Series,
	SeriesWithChapters,
	Tag,
	ToggleBookmarkResponse,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "./client";
import { queryKeys } from "./keys";
import type { ListSeriesParams } from "./params";

// Query Options

export const getHealthQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.health,
		queryFn: async () => {
			const { data } = await api.get<HealthResponse>("/health", config);
			return data;
		},
	});

export const listBookmarksQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.bookmarks,
		queryFn: async () => {
			const { data } = await api.get<Bookmark[]>("/bookmarks", config);
			return data;
		},
	});

export const getBookmarkStatusQueryOptions = (
	seriesId: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.bookmarkStatusDetail(seriesId),
		queryFn: async () => {
			const { data } = await api.get<BookmarkStatusResponse>(
				`/bookmarks/${seriesId}`,
				config,
			);
			return data;
		},
		enabled: !!seriesId,
	});

export const listSeriesQueryOptions = (
	params?: ListSeriesParams,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.series(params),
		queryFn: async () => {
			const { data } = await api.get<PaginatedResponse<Series>>("/manga", {
				...config,
				params,
			});
			return data;
		},
	});

export const getSeriesBySlugQueryOptions = (
	slug: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.seriesBySlugDetail(slug),
		queryFn: async () => {
			const { data } = await api.get<SeriesWithChapters>(
				`/manga/${slug}`,
				config,
			);
			return data;
		},
		enabled: !!slug,
	});

export const getChapterQueryOptions = (
	slug: string,
	number: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.chapterDetail(slug),
		queryFn: async () => {
			const { data } = await api.get<ChapterReader>(
				`/manga/${slug}/chapters/${number}`,
				config,
			);
			return data;
		},
		enabled: !!slug,
	});

export const listTagsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.tags,
		queryFn: async () => {
			const { data } = await api.get<Tag[]>("/tags", config);
			return data;
		},
	});

// Mutation Functions

export const toggleBookmark = async (
	seriesId: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<ToggleBookmarkResponse>(
		`/bookmarks/${seriesId}`,
		undefined,
		config,
	);
	return data;
};

export const incrementSeriesView = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/series/${id}/view`,
		undefined,
		config,
	);
	return data;
};

export const incrementChapterView = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/chapters/${id}/view`,
		undefined,
		config,
	);
	return data;
};

// Mutation Options

export const toggleBookmarkMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (seriesId: string) => toggleBookmark(seriesId, config),
	});

export const incrementSeriesViewMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (id: string) => incrementSeriesView(id, config),
	});

export const incrementChapterViewMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (id: string) => incrementChapterView(id, config),
	});
