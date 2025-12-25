"use client";

import type { SeriesStatus, Tag } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import { Field, FieldLabel } from "@docix/ui/components/field";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { type ImageValue, uploadImageValue } from "@docix/api";
import {
	defaultSeriesFormValues,
	SERIES_STATUSES,
	type SeriesFormData,
	type SeriesFormValues,
	toFormData,
} from "./constants";
import { TagSelector } from "./tag-selector";

// Schema validates the internal form values (with ImageValue)
const seriesSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string(),
	cover_image: z.custom<ImageValue>(), // ImageValue object
	author: z.string(),
	artist: z.string(),
	status: z.enum(["ongoing", "completed", "hiatus", "cancelled"]),
	tag_ids: z.array(z.string()),
});

interface SeriesFormProps {
	/** Initial values for the form (for edit mode) - uses ImageValue format */
	defaultValues?: SeriesFormValues;
	/** Available tags for selection */
	tags: Tag[];
	/** Called when form is submitted with valid data - receives API format */
	onSubmit: (data: SeriesFormData) => Promise<void> | void;
	/** Whether the form submission is pending */
	isPending?: boolean;
	/** Cancel URL (defaults to /series) */
	cancelHref?: string;
	/** Submit button label */
	submitLabel?: string;
}

export function SeriesForm({
	defaultValues,
	tags,
	onSubmit,
	isPending = false,
	cancelHref = "/series",
	submitLabel = "Save",
}: SeriesFormProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	// Use provided values or defaults
	const initialValues: SeriesFormValues =
		defaultValues ?? defaultSeriesFormValues;

	const form = useAppForm({
		defaultValues: initialValues,
		validators: {
			onSubmit: seriesSchema,
		},
		onSubmit: async ({ value }) => {
			setUploadError(null);
			setIsUploading(true);

			try {
				// Upload pending image if needed
				let uploadedCoverUrl: string | null = null;
				if (value.cover_image.pendingFile) {
					uploadedCoverUrl = await uploadImageValue(value.cover_image);
				}

				// Convert form values to API format and submit
				const apiData = toFormData(value, uploadedCoverUrl);
				await onSubmit(apiData);
			} catch (error) {
				console.error("Upload failed:", error);
				setUploadError("Failed to upload cover image. Please try again.");
			} finally {
				setIsUploading(false);
			}
		},
	});

	const isSubmitting = isPending || isUploading;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<div className="grid gap-4">
				<form.AppField name="title">
					{(field) => (
						<field.TextField required label="Title" placeholder="One Piece" />
					)}
				</form.AppField>

				<form.AppField name="status">
					{(field) => (
						<field.SelectField<SeriesStatus>
							required
							label="Status"
							options={SERIES_STATUSES}
						/>
					)}
				</form.AppField>

				<div className="grid grid-cols-2 gap-4">
					<form.AppField name="author">
						{(field) => (
							<field.TextField label="Author" placeholder="Eiichiro Oda" />
						)}
					</form.AppField>

					<form.AppField name="artist">
						{(field) => (
							<field.TextField label="Artist" placeholder="Eiichiro Oda" />
						)}
					</form.AppField>
				</div>

				<form.AppField name="cover_image">
					{(field) => <field.ImageUploadField label="Cover Image" />}
				</form.AppField>

				<form.AppField name="description">
					{(field) => (
						<field.TextArea
							label="Description"
							placeholder="A story about a boy who wants to become the Pirate King..."
						/>
					)}
				</form.AppField>

				<form.AppField name="tag_ids">
					{(field) => (
						<Field>
							<FieldLabel>Tags</FieldLabel>
							<TagSelector
								tags={tags}
								selectedIds={field.state.value}
								onChange={(ids) => field.handleChange(ids)}
							/>
						</Field>
					)}
				</form.AppField>

				{uploadError && (
					<p className="text-sm text-destructive">{uploadError}</p>
				)}
			</div>

			<div className="flex items-center justify-end gap-4 pt-4 border-t">
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href={cancelHref} />}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<form.AppForm>
					<form.SubscribeButton
						label={isUploading ? "Uploading..." : submitLabel}
						disabled={isSubmitting}
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
