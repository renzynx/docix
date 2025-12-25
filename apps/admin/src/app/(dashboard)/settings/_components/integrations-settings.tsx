"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { IntegrationsConfig } from "@docix/types";
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

const integrationsSchema = z.object({
	smtp_host: z.string(),
	smtp_port: z.number(),
	smtp_username: z.string(),
	smtp_password: z.string(),
	smtp_from_email: z.string(),
	smtp_from_name: z.string(),
	smtp_enabled: z.boolean(),
	cdn_enabled: z.boolean(),
	cdn_base_url: z.string(),
});

type IntegrationsForm = z.infer<typeof integrationsSchema>;

interface IntegrationsSettingsProps {
	settings: IntegrationsConfig;
}

export function IntegrationsSettings({ settings }: IntegrationsSettingsProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (values: IntegrationsForm) =>
			adminUpdateSiteSettings({
				integrations: {
					smtp_host: values.smtp_host,
					smtp_port: values.smtp_port,
					smtp_username: values.smtp_username,
					smtp_password: values.smtp_password || undefined,
					smtp_from_email: values.smtp_from_email,
					smtp_from_name: values.smtp_from_name,
					smtp_enabled: values.smtp_enabled,
					cdn_enabled: values.cdn_enabled,
					cdn_base_url: values.cdn_base_url,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			form.setFieldValue("smtp_password", "");
			toast.success("Integration settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const form = useAppForm({
		defaultValues: {
			smtp_host: settings.smtp_host,
			smtp_port: settings.smtp_port,
			smtp_username: settings.smtp_username,
			smtp_password: "",
			smtp_from_email: settings.smtp_from_email,
			smtp_from_name: settings.smtp_from_name,
			smtp_enabled: settings.smtp_enabled,
			cdn_enabled: settings.cdn_enabled,
			cdn_base_url: settings.cdn_base_url,
		} satisfies IntegrationsForm,
		validators: {
			onSubmit: integrationsSchema,
		},
		onSubmit: ({ value }) => mutation.mutate(value),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Integrations</CardTitle>
				<CardDescription>
					Configure email, CDN, and other external service settings.
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
					{/* SMTP Settings */}
					<div className="space-y-4">
						<form.AppField name="smtp_enabled">
							{(field) => (
								<field.SwitchField
									label="SMTP Email"
									description="Configure email sending for notifications"
								/>
							)}
						</form.AppField>

						<form.Subscribe selector={(state) => state.values.smtp_enabled}>
							{(smtpEnabled) => (
								<>
									<div className="grid gap-4 sm:grid-cols-2">
										<form.AppField name="smtp_host">
											{(field) => (
												<field.TextField
													label="SMTP Host"
													placeholder="smtp.example.com"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
										<form.AppField name="smtp_port">
											{(field) => (
												<field.NumberField
													label="SMTP Port"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.AppField name="smtp_username">
											{(field) => (
												<field.TextField
													label="Username"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
										<form.AppField name="smtp_password">
											{(field) => (
												<field.TextField
													label="Password"
													type="password"
													placeholder="Leave empty to keep current"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<form.AppField name="smtp_from_email">
											{(field) => (
												<field.TextField
													label="From Email"
													type="email"
													placeholder="noreply@example.com"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
										<form.AppField name="smtp_from_name">
											{(field) => (
												<field.TextField
													label="From Name"
													placeholder="Docix"
													disabled={!smtpEnabled}
												/>
											)}
										</form.AppField>
									</div>
								</>
							)}
						</form.Subscribe>
					</div>

					{/* CDN Settings */}
					<div className="space-y-4 border-t pt-4">
						<form.AppField name="cdn_enabled">
							{(field) => (
								<field.SwitchField
									label="CDN"
									description="Content delivery network for images"
								/>
							)}
						</form.AppField>

						<form.Subscribe selector={(state) => state.values.cdn_enabled}>
							{(cdnEnabled) => (
								<form.AppField name="cdn_base_url">
									{(field) => (
										<field.TextField
											label="CDN Base URL"
											placeholder="https://cdn.example.com"
											disabled={!cdnEnabled}
										/>
									)}
								</form.AppField>
							)}
						</form.Subscribe>
					</div>

					<form.AppForm>
						<form.SubscribeButton label="Save Changes" />
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
