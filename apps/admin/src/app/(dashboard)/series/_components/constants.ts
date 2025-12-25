import {
	createEmptyImageValue,
	createImageValueFromFilename,
	type ImageValue,
} from "@docix/api";
import type { Series, SeriesStatus } from "@docix/types";

export const SERIES_STATUSES: { value: SeriesStatus; label: string }[] = [
	{ value: "ongoing", label: "Ongoing" },
	{ value: "completed", label: "Completed" },
	{ value: "hiatus", label: "Hiatus" },
	{ value: "cancelled", label: "Cancelled" },
];

export function getStatusColor(status: SeriesStatus) {
	switch (status) {
		case "ongoing":
			return "default";
		case "completed":
			return "secondary";
		case "hiatus":
			return "outline";
		case "cancelled":
			return "destructive";
		default:
			return "default";
	}
}

/** Form data structure (internal - uses ImageValue for cover_image) */
export interface SeriesFormValues {
	title: string;
	description: string;
	cover_image: ImageValue;
	author: string;
	artist: string;
	status: SeriesStatus;
	tag_ids: string[];
}

/** API data structure for submission (external - uses filename string for cover_image) */
export interface SeriesFormData {
	title: string;
	description: string;
	cover_image: string; // filename like "uuid.webp"
	author: string;
	artist: string;
	status: SeriesStatus;
	tag_ids: string[];
}

export const defaultSeriesFormValues: SeriesFormValues = {
	title: "",
	description: "",
	cover_image: createEmptyImageValue(),
	author: "",
	artist: "",
	status: "ongoing",
	tag_ids: [],
};

/** Convert API response (Series) to form values (for edit mode) */
export function toFormValues(apiData: Series): SeriesFormValues {
	return {
		title: apiData.title,
		description: apiData.description || "",
		cover_image:
			apiData.cover_image && apiData.cover_image_url
				? createImageValueFromFilename(
						apiData.cover_image,
						apiData.cover_image_url,
					)
				: createEmptyImageValue(),
		author: apiData.author || "",
		artist: apiData.artist || "",
		status: apiData.status,
		tag_ids: apiData.tags?.map((t) => t.id) || [],
	};
}

/** Convert form values to API data (for submission) */
export function toFormData(
	values: SeriesFormValues,
	uploadedFilename: string | null,
): SeriesFormData {
	return {
		title: values.title,
		description: values.description,
		cover_image: uploadedFilename ?? values.cover_image.filename ?? "",
		author: values.author,
		artist: values.artist,
		status: values.status,
		tag_ids: values.tag_ids,
	};
}
