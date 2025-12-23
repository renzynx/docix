import { api } from "./api.generated";

// ============================================================================
// Upload API (manual - not generated)
// ============================================================================

/**
 * Response from upload endpoint - returns just the filename
 */
export interface UploadResponse {
	filename: string;
}

export interface BulkUploadResponse {
	uploads?: UploadResponse[];
	failed?: string[];
}

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
// WebP Conversion
// ============================================================================

/**
 * Default WebP quality (0-1)
 */
const WEBP_QUALITY = 0.85;

/**
 * Convert an image file to WebP using Canvas API
 * @param file - The image file to convert
 * @param quality - WebP quality (0-1), defaults to 0.85
 * @returns Promise resolving to a WebP Blob
 */
async function convertToWebP(
	file: File,
	quality = WEBP_QUALITY,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			// Create canvas with image dimensions
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			// Draw image to canvas
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}
			ctx.drawImage(img, 0, 0);

			// Convert to WebP blob
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to convert image to WebP"));
					}
				},
				"image/webp",
				quality,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}

/**
 * Convert a File to WebP and create a new File object
 * @param file - The original file
 * @param quality - WebP quality (0-1)
 * @returns Promise resolving to a WebP File
 */
async function convertFileToWebP(
	file: File,
	quality = WEBP_QUALITY,
): Promise<File> {
	// If already WebP, return as-is
	if (file.type === "image/webp") {
		return file;
	}

	const blob = await convertToWebP(file, quality);

	// Create new filename with .webp extension
	const originalName = file.name.replace(/\.[^.]+$/, "");
	const webpName = `${originalName}.webp`;

	return new File([blob], webpName, { type: "image/webp" });
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a single image file
 * Converts to WebP client-side before uploading
 * Returns the stored filename (not a signed URL)
 */
export async function uploadImage(file: File): Promise<string> {
	// Convert to WebP on client-side
	const webpFile = await convertFileToWebP(file);

	const formData = new FormData();
	formData.append("file", webpFile);

	const response = await api.post<UploadResponse>("/admin/upload", formData);

	return response.data.filename;
}

/**
 * Upload multiple image files
 * Converts all to WebP client-side before uploading
 * Returns the stored filenames
 */
export async function uploadImages(files: File[]): Promise<{
	filenames: string[];
	failed: string[];
}> {
	// Convert all files to WebP in parallel
	const webpFiles = await Promise.all(
		files.map((file) => convertFileToWebP(file)),
	);

	const formData = new FormData();
	for (const file of webpFiles) {
		formData.append("files", file);
	}

	const response = await api.post<BulkUploadResponse>(
		"/admin/upload/bulk",
		formData,
	);

	return {
		filenames: (response.data.uploads ?? []).map((u) => u.filename),
		failed: response.data.failed ?? [],
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
