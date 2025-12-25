import { api } from "./api";

// ============================================================================
// Upload API Types
// ============================================================================

/**
 * Response from initial upload - returns upload_id and status
 */
export interface AsyncUploadResponse {
	upload_id: string;
	status: "pending" | "completed";
}

/**
 * Response from bulk upload endpoint
 */
export interface AsyncBulkUploadResponse {
	uploads: AsyncUploadResponse[];
	failed?: string[];
}

/**
 * Response from status polling endpoint
 */
export interface UploadStatusResponse {
	upload_id: string;
	status: "pending" | "processing" | "completed" | "failed";
	filename?: string;
	error?: string;
	width?: number;
	height?: number;
	size?: number;
}

// ============================================================================
// Image Value Types (for form handling)
// ============================================================================

/**
 * Represents an image that can be either:
 * - A pending file (not yet uploaded)
 * - An uploaded filename (stored in DB)
 * - Empty/null
 */
export interface ImageValue {
	/** The stored filename (e.g., "uuid.webp") - set after upload */
	filename: string | null;
	/** The pending file to upload (if not yet uploaded) */
	pendingFile: File | null;
	/** Preview URL for display (blob URL for pending, signed URL for uploaded) */
	previewUrl: string | null;
}

/**
 * Create an empty image value
 */
export function createEmptyImageValue(): ImageValue {
	return {
		filename: null,
		pendingFile: null,
		previewUrl: null,
	};
}

/**
 * Create an image value from an existing filename (e.g., when editing)
 * The previewUrl should be the signed CDN URL from the backend
 */
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

/**
 * Create an image value from a pending file
 */
export function createImageValueFromFile(file: File): ImageValue {
	return {
		filename: null,
		pendingFile: file,
		previewUrl: URL.createObjectURL(file),
	};
}

/**
 * Check if an image value has content (either pending or uploaded)
 */
export function hasImageValue(value: ImageValue): boolean {
	return value.filename !== null || value.pendingFile !== null;
}

/**
 * Get the filename from an image value (only if uploaded)
 */
export function getImageFilename(value: ImageValue): string | null {
	return value.filename;
}

/**
 * Clean up blob URLs when no longer needed
 */
export function revokeImagePreview(value: ImageValue): void {
	if (value.pendingFile && value.previewUrl?.startsWith("blob:")) {
		URL.revokeObjectURL(value.previewUrl);
	}
}

// ============================================================================
// Polling Configuration
// ============================================================================

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 60; // 30 seconds max wait

// ============================================================================
// Upload Status Polling
// ============================================================================

/**
 * Poll upload status until completion or failure
 * @param uploadId - The upload ID to poll
 * @returns Promise resolving to the final filename
 * @throws Error if upload fails or times out
 */
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
				// Continue polling
				await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				attempts++;
				break;

			default:
				throw new Error(`Unknown upload status: ${status.status}`);
		}
	}

	throw new Error("Upload timed out waiting for processing");
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a single image file
 * Sends original file to backend for WebP conversion
 * Returns the stored filename after processing completes
 */
export async function uploadImage(file: File): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await api.post<AsyncUploadResponse>(
		"/admin/upload",
		formData,
	);

	const { upload_id, status } = response.data;

	// If already completed (file was already WebP), return immediately
	if (status === "completed") {
		return upload_id; // upload_id is the filename for completed uploads
	}

	// Poll for completion
	return pollUploadStatus(upload_id);
}

/**
 * Upload multiple image files
 * Sends original files to backend for WebP conversion
 * Returns the stored filenames after all processing completes
 */
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

	// Poll all pending uploads in parallel
	const filenamePromises = uploads.map(async ({ upload_id, status }) => {
		if (status === "completed") {
			return upload_id; // Already completed
		}
		return pollUploadStatus(upload_id);
	});

	const filenames = await Promise.all(filenamePromises);

	return {
		filenames,
		failed,
	};
}

/**
 * Upload an ImageValue if it has a pending file
 * Returns the filename (either existing or newly uploaded)
 */
export async function uploadImageValue(value: ImageValue): Promise<string> {
	// If already uploaded, return the filename
	if (value.filename) {
		return value.filename;
	}

	// If there's a pending file, upload it
	if (value.pendingFile) {
		return await uploadImage(value.pendingFile);
	}

	throw new Error("No image to upload");
}
