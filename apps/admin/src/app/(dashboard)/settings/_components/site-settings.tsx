"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { SiteConfig } from "@docix/types";
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

const siteSettingsSchema = z.object({
	name: z.string().min(1, "Site name is required"),
	description: z.string(),
	default_locale: z.string(),
	logo_url: z.string(),
	favicon_url: z.string(),
	meta_title: z.string(),
	meta_description: z.string(),
});

interface SiteSettingsProps {
	settings: SiteConfig;
}

export function SiteSettings({ settings }: SiteSettingsProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (values: SiteConfig) =>
			adminUpdateSiteSettings({ site: values }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("Site settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const form = useAppForm({
		defaultValues: settings,
		validators: {
			onSubmit: siteSettingsSchema,
		},
		onSubmit: ({ value }) => mutation.mutate(value),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Site Configuration</CardTitle>
				<CardDescription>
					General site settings like name, description, and SEO metadata.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="name">
							{(field) => <field.TextField label="Site Name" />}
						</form.AppField>
						<form.AppField name="default_locale">
							{(field) => <field.TextField label="Default Locale" />}
						</form.AppField>
					</div>

					<form.AppField name="description">
						{(field) => <field.TextArea label="Site Description" rows={3} />}
					</form.AppField>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="logo_url">
							{(field) => (
								<field.TextField label="Logo URL" placeholder="https://..." />
							)}
						</form.AppField>
						<form.AppField name="favicon_url">
							{(field) => (
								<field.TextField
									label="Favicon URL"
									placeholder="https://..."
								/>
							)}
						</form.AppField>
					</div>

					<form.AppField name="meta_title">
						{(field) => <field.TextField label="Meta Title" />}
					</form.AppField>

					<form.AppField name="meta_description">
						{(field) => <field.TextArea label="Meta Description" rows={2} />}
					</form.AppField>

					<form.AppForm>
						<form.SubscribeButton label="Save Changes" />
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
