import type {
	AsyncBulkUploadResponse,
	AsyncUploadResponse,
	MessageResponse,
	UploadStatusResponse,
} from "@docix/types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "./client";
import { queryKeys } from "./keys";

// Query Options

export const adminGetUploadStatusQueryOptions = (
	id: string,
	config?: AxiosRequestConfig,
) =>
	queryOptions({
		queryKey: queryKeys.adminUploadStatusDetail(id),
		queryFn: async () => {
			const { data } = await api.get<UploadStatusResponse>(
				`/admin/upload/${id}/status`,
				config,
			);
			return data;
		},
		enabled: !!id,
	});

// Mutation Functions

export const adminUploadFile = async (config?: AxiosRequestConfig) => {
	const { data } = await api.post<AsyncUploadResponse>(
		"/admin/upload",
		undefined,
		config,
	);
	return data;
};

export const adminUploadMultipleFiles = async (config?: AxiosRequestConfig) => {
	const { data } = await api.post<AsyncBulkUploadResponse>(
		"/admin/upload/bulk",
		undefined,
		config,
	);
	return data;
};

export const adminCleanOrphanedFiles = async (config?: AxiosRequestConfig) => {
	const { data } = await api.delete<MessageResponse>(
		"/admin/upload/cleanup",
		config,
	);
	return data;
};

// Mutation Options

export const adminUploadFileMutationOptions = (config?: AxiosRequestConfig) =>
	mutationOptions({
		mutationFn: () => adminUploadFile(config),
	});

export const adminUploadMultipleFilesMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: () => adminUploadMultipleFiles(config),
	});

export const adminCleanOrphanedFilesMutationOptions = (
	config?: AxiosRequestConfig,
) =>
	mutationOptions({
		mutationFn: () => adminCleanOrphanedFiles(config),
	});

// Image Value Types (for form handling)

export interface ImageValue {
	filename: string | null;
	pendingFile: File | null;
	previewUrl: string | null;
}

export function createEmptyImageValue(): ImageValue {
	return {
		filename: null,
		pendingFile: null,
		previewUrl: null,
	};
}

export function createImageValueFromFilename(
	filename: string,
	signedUrl: string,
): ImageValue {
	return {
		filename,
		pendingFile: null,
		previewUrl: signedUrl,
	};
}

export function createImageValueFromFile(file: File): ImageValue {
	return {
		filename: null,
		pendingFile: file,
		previewUrl: URL.createObjectURL(file),
	};
}

export function hasImageValue(value: ImageValue): boolean {
	return value.filename !== null || value.pendingFile !== null;
}

export function getImageFilename(value: ImageValue): string | null {
	return value.filename;
}

export function revokeImagePreview(value: ImageValue): void {
	if (value.pendingFile && value.previewUrl?.startsWith("blob:")) {
		URL.revokeObjectURL(value.previewUrl);
	}
}

// Polling Configuration

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 60;

// Upload Status Polling

async function pollUploadStatus(uploadId: string): Promise<string> {
	let attempts = 0;

	while (attempts < MAX_POLL_ATTEMPTS) {
		const response = await api.get<UploadStatusResponse>(
			`/admin/upload/${uploadId}/status`,
		);
		const status = response.data;

		switch (status.status) {
			case "completed":
				if (!status.filename) {
					throw new Error("Upload completed but no filename returned");
				}
				return status.filename;

			case "failed":
				throw new Error(status.error || "Upload processing failed");

			case "pending":
			case "processing":
				await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				attempts++;
				break;

			default:
				throw new Error(`Unknown upload status: ${status.status}`);
		}
	}

	throw new Error("Upload timed out waiting for processing");
}

// Upload Functions

export async function uploadImage(file: File): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await api.post<AsyncUploadResponse>(
		"/admin/upload",
		formData,
	);

	const { upload_id, status } = response.data;

	if (status === "completed") {
		return upload_id;
	}

	return pollUploadStatus(upload_id);
}

export async function uploadImages(files: File[]): Promise<{
	filenames: string[];
	failed: string[];
}> {
	const formData = new FormData();
	for (const file of files) {
		formData.append("files", file);
	}

	const response = await api.post<AsyncBulkUploadResponse>(
		"/admin/upload/bulk",
		formData,
	);

	const { uploads, failed = [] } = response.data;

	const filenamePromises = uploads.map(async ({ upload_id, status }) => {
		if (status === "completed") {
			return upload_id;
		}
		return pollUploadStatus(upload_id);
	});

	const filenames = await Promise.all(filenamePromises);

	return {
		filenames,
		failed,
	};
}

export async function uploadImageValue(value: ImageValue): Promise<string> {
	if (value.filename) {
		return value.filename;
	}

	if (value.pendingFile) {
		return await uploadImage(value.pendingFile);
	}

	throw new Error("No image to upload");
}
