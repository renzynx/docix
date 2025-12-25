import type {
	MaintenanceAction,
	MaintenanceActionResponse,
	SiteSettings,
	SystemInfo,
	UpdateSiteSettingsRequest,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "../client";
import { queryKeys } from "../keys";

// Query Options

export const adminGetSiteSettingsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminSiteSettings,
		queryFn: async () => {
			const { data } = await api.get<SiteSettings>("/admin/settings", config);
			return data;
		},
	});

export const adminGetSystemInfoQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.adminSystemInfo,
		queryFn: async () => {
			const { data } = await api.get<SystemInfo>(
				"/admin/settings/system",
				config,
			);
			return data;
		},
	});

// Mutation Functions

export const adminUpdateSiteSettings = async (
	request: UpdateSiteSettingsRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.put<SiteSettings>(
		"/admin/settings",
		request,
		config,
	);
	return data;
};

export const adminPerformMaintenanceAction = async (
	request: MaintenanceAction,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MaintenanceActionResponse>(
		"/admin/settings/maintenance",
		request,
		config,
	);
	return data;
};

// Mutation Options

export const adminUpdateSiteSettingsMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (request: UpdateSiteSettingsRequest) =>
			adminUpdateSiteSettings(request, config),
	});

export const adminPerformMaintenanceActionMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: (request: MaintenanceAction) =>
			adminPerformMaintenanceAction(request, config),
	});
