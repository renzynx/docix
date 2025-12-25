import type {
	CreateTagRequest,
	MessageResponse,
	Tag,
	UpdateTagRequest,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";

// Query Options

export const adminListTagsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminTags,
		queryFn: async () => {
			const { data } = await api.get<Tag[]>("/admin/tags", config);
			return data;
		},
	});

// Mutation Functions

export const adminCreateTag = async (
	request: CreateTagRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<Tag>("/admin/tags", request, config);
	return data;
};

export const adminUpdateTag = async (
	id: string,
	request: UpdateTagRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<MessageResponse>(
		`/admin/tags/${id}`,
		request,
		config,
	);
	return data;
};

export const adminDeleteTag = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/tags/${id}`,
		config,
	);
	return data;
};

// Mutation Options

export const adminCreateTagMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: CreateTagRequest) => adminCreateTag(request, config),
	});

export const adminUpdateTagMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & UpdateTagRequest) =>
			adminUpdateTag(id, request, config),
	});

export const adminDeleteTagMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (id: string) => adminDeleteTag(id, config),
	});
