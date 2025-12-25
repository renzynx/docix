import type {
	AuthResponse,
	ChangePasswordRequest,
	CurrentSessionResponse,
	MessageResponse,
	RequestVerificationResponse,
	RevokeSessionRequest,
	SessionListItem,
	SignInRequest,
	SignUpRequest,
	UpdateUserRequest,
	UpdateUserResponse,
	UserPermissionsResponse,
	VerifyEmailRequest,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "./client";
import { queryKeys } from "./keys";

// Query Options

export const getCurrentSessionQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.currentSession,
		queryFn: async () => {
			const { data } = await api.get<CurrentSessionResponse | null>(
				"/auth/session",
				config,
			);
			return data;
		},
	});

export const listSessionsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.sessions,
		queryFn: async () => {
			const { data } = await api.get<SessionListItem[]>(
				"/auth/sessions",
				config,
			);
			return data;
		},
	});

export const getUserPermissionsQueryOptions = (config?: AxiosRequestConfig) =>
	queryOptions({
		queryKey: queryKeys.userPermissions,
		queryFn: async () => {
			const { data } = await api.get<UserPermissionsResponse>(
				"/auth/permissions",
				config,
			);
			return data;
		},
	});

// Mutation Functions

export const signUp = async (
	request: SignUpRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/auth/sign-up",
		request,
		config,
	);
	return data;
};

export const signIn = async (
	request: SignInRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<AuthResponse>(
		"/auth/sign-in",
		request,
		config,
	);
	return data;
};

export const signOut = async (config?: AxiosRequestConfig) => {
	const { data } = await api.post<MessageResponse>(
		"/auth/sign-out",
		undefined,
		config,
	);
	return data;
};

export const guestLogin = async (config?: AxiosRequestConfig) => {
	const { data } = await api.post<CurrentSessionResponse>(
		"/auth/guest",
		undefined,
		config,
	);
	return data;
};

export const verifyEmail = async (
	request: VerifyEmailRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/auth/verify-email",
		request,
		config,
	);
	return data;
};

export const updateUser = async (
	request: UpdateUserRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.patch<UpdateUserResponse>(
		"/auth/update-user",
		request,
		config,
	);
	return data;
};

export const changePassword = async (
	request: ChangePasswordRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.post<MessageResponse>(
		"/auth/change-password",
		request,
		config,
	);
	return data;
};

export const requestEmailVerification = async (config?: AxiosRequestConfig) => {
	const { data } = await api.post<RequestVerificationResponse>(
		"/auth/request-verification",
		undefined,
		config,
	);
	return data;
};

export const revokeSession = async (
	request: RevokeSessionRequest,
	config?: AxiosRequestConfig,
) => {
	const { data } = await api.delete<MessageResponse>("/auth/sessions", {
		...config,
		data: request,
	});
	return data;
};

// Mutation Options

export const signUpMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: SignUpRequest) => signUp(request, config),
	});

export const signInMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: SignInRequest) => signIn(request, config),
	});

export const signOutMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: () => signOut(config),
	});

export const guestLoginMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: () => guestLogin(config),
	});

export const verifyEmailMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: VerifyEmailRequest) => verifyEmail(request, config),
	});

export const updateUserMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: UpdateUserRequest) => updateUser(request, config),
	});

export const changePasswordMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: ChangePasswordRequest) =>
			changePassword(request, config),
	});

export const requestEmailVerificationMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: () => requestEmailVerification(config),
	});

export const revokeSessionMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: (request: RevokeSessionRequest) =>
			revokeSession(request, config),
	});
