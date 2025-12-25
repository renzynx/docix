"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { UserConfig } from "@docix/types";
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

const userSettingsSchema = z.object({
	registration_open: z.boolean(),
	require_email_verification: z.boolean(),
	allow_username_change: z.boolean(),
	max_login_attempts: z.number().min(1).max(20),
	default_role_id: z.string(),
});

interface UserSettingsProps {
	settings: UserConfig;
}

export function UserSettings({ settings }: UserSettingsProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (values: UserConfig) =>
			adminUpdateSiteSettings({ users: values }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("User settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const form = useAppForm({
		defaultValues: settings,
		validators: {
			onSubmit: userSettingsSchema,
		},
		onSubmit: ({ value }) => mutation.mutate(value),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>User Settings</CardTitle>
				<CardDescription>
					Configure registration, authentication, and user management options.
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
					<div className="space-y-4">
						<form.AppField name="registration_open">
							{(field) => (
								<field.SwitchField
									label="Registration Open"
									description="Allow new users to register"
								/>
							)}
						</form.AppField>

						<form.AppField name="require_email_verification">
							{(field) => (
								<field.SwitchField
									label="Require Email Verification"
									description="Users must verify their email before accessing all features"
								/>
							)}
						</form.AppField>

						<form.AppField name="allow_username_change">
							{(field) => (
								<field.SwitchField
									label="Allow Username Change"
									description="Users can change their username after registration"
								/>
							)}
						</form.AppField>
					</div>

					<form.AppField name="max_login_attempts">
						{(field) => (
							<field.NumberField
								label="Max Login Attempts"
								min={1}
								max={20}
								description="Before temporary lockout"
							/>
						)}
					</form.AppField>

					<form.AppField name="default_role_id">
						{(field) => (
							<field.TextField
								label="Default Role ID"
								placeholder="Leave empty for no default role"
								description="Role automatically assigned to new users"
							/>
						)}
					</form.AppField>

					<form.AppForm>
						<form.SubscribeButton label="Save Changes" />
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
