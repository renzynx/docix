"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { ContentConfig } from "@docix/types";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";

const contentSettingsSchema = z.object({
	max_upload_size_mb: z.number().min(1),
	max_chapters_per_day: z.number().min(1),
	allowed_image_types: z.string(),
	default_content_rating: z.string(),
	enable_comments: z.boolean(),
	require_moderation: z.boolean(),
});

interface ContentSettingsProps {
	settings: ContentConfig;
}

export function ContentSettings({ settings }: ContentSettingsProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (values: ContentConfig) =>
			adminUpdateSiteSettings({ content: values }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("Content settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const form = useAppForm({
		defaultValues: settings,
		validators: {
			onSubmit: contentSettingsSchema,
		},
		onSubmit: ({ value }) => mutation.mutate(value),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Content Settings</CardTitle>
				<CardDescription>
					Configure upload limits, content rules, and moderation settings.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="max_upload_size_mb">
							{(field) => (
								<field.NumberField
									label="Max Upload Size (MB)"
									min={1}
									required
								/>
							)}
						</form.AppField>
						<form.AppField name="max_chapters_per_day">
							{(field) => (
								<field.NumberField
									label="Max Chapters Per Day"
									min={1}
									required
								/>
							)}
						</form.AppField>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="allowed_image_types">
							{(field) => (
								<field.TextField
									label="Allowed Image Types"
									placeholder="jpg,jpeg,png,webp,gif"
									description="Comma-separated list of extensions"
								/>
							)}
						</form.AppField>
						<form.AppField name="default_content_rating">
							{(field) => <field.TextField label="Default Content Rating" />}
						</form.AppField>
					</div>

					<div className="space-y-4">
						<form.AppField name="enable_comments">
							{(field) => (
								<field.SwitchField
									label="Enable Comments"
									description="Allow users to comment on series and chapters"
								/>
							)}
						</form.AppField>

						<form.AppField name="require_moderation">
							{(field) => (
								<field.SwitchField
									label="Require Moderation"
									description="New content requires approval before publishing"
								/>
							)}
						</form.AppField>
					</div>

					<form.AppForm>
						<form.SubscribeButton label="Save Changes" />
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
