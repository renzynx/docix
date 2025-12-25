import type {
	AssignRoleRequest,
	CreateRoleRequest,
	MessageResponse,
	Role,
	UpdateRoleRequest,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";

// Query Options

export const adminListRolesQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminRoles,
		queryFn: async () => {
			const { data } = await api.get<Role[]>("/admin/roles", config);
			return data;
		},
	});

export const adminGetRoleQueryOptions = (
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminRoleDetail(id),
		queryFn: async () => {
			const { data } = await api.get<Role>(`/admin/roles/${id}`, config);
			return data;
		},
		enabled: !!id,
	});

// Mutation Functions

export const adminCreateRole = async (
	request: CreateRoleRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<Role>("/admin/roles", request, config);
	return data;
};

export const adminUpdateRole = async (
	id: string,
	request: UpdateRoleRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<Role>(`/admin/roles/${id}`, request, config);
	return data;
};

export const adminDeleteRole = async (
	id: string,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>(
		`/admin/roles/${id}`,
		config,
	);
	return data;
};

export const adminAssignRole = async (
	request: AssignRoleRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/admin/roles/assign",
		request,
		config,
	);
	return data;
};

export const adminRemoveRole = async (
	request: AssignRoleRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/admin/roles/remove",
		request,
		config,
	);
	return data;
};

// Mutation Options

export const adminCreateRoleMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: CreateRoleRequest) =>
			adminCreateRole(request, config),
	});

export const adminUpdateRoleMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: ({ id, ...request }: { id: string } & UpdateRoleRequest) =>
			adminUpdateRole(id, request, config),
	});

export const adminDeleteRoleMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (id: string) => adminDeleteRole(id, config),
	});

export const adminAssignRoleMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: AssignRoleRequest) =>
			adminAssignRole(request, config),
	});

export const adminRemoveRoleMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: AssignRoleRequest) =>
			adminRemoveRole(request, config),
	});
