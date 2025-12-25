import type {
	BanUserRequest,
	MessageResponse,
	PaginatedResponse,
	User,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";

// Query Options

export const adminListUsersQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminUsers,
		queryFn: async () => {
			const { data } = await api.get<PaginatedResponse<User>>(
				"/admin/users",
				config,
			);
			return data;
		},
	});

// Mutation Functions

export const adminBanUser = async (
	request: BanUserRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/admin/users/ban",
		request,
		config,
	);
	return data;
};

export const adminUnbanUser = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		`/admin/users/unban/${id}`,
		undefined,
		config,
	);
	return data;
};

// Mutation Options

export const adminBanUserMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: BanUserRequest) => adminBanUser(request, config),
	});

export const adminUnbanUserMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (id: string) => adminUnbanUser(id, config),
	});
