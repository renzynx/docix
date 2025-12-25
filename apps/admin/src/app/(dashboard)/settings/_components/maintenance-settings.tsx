"use client";

import {
	adminCleanOrphanedFiles,
	adminPerformMaintenanceAction,
	adminUpdateSiteSettings,
	queryKeys,
} from "@docix/api";
import type { MaintenanceConfig } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Label } from "@docix/ui/components/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";

const maintenanceSchema = z.object({
	enabled: z.boolean(),
	message: z.string(),
	allowed_ips: z.string(),
});

interface MaintenanceSettingsProps {
	settings: MaintenanceConfig;
}

export function MaintenanceSettings({ settings }: MaintenanceSettingsProps) {
	const queryClient = useQueryClient();

	const updateMutation = useMutation({
		mutationFn: (values: MaintenanceConfig) =>
			adminUpdateSiteSettings({ maintenance: values }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("Maintenance settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const actionMutation = useMutation({
		mutationFn: (action: string) => adminPerformMaintenanceAction({ action }),
		onSuccess: (data) => {
			if (data.success) {
				toast.success(data.message);
			} else {
				toast.error(data.message);
			}
		},
		onError: () => {
			toast.error("Action failed");
		},
	});

	const cleanupMutation = useMutation({
		mutationFn: () => adminCleanOrphanedFiles(),
		onSuccess: (data) => {
			toast.success(data.message || "Cleanup task enqueued");
		},
		onError: () => {
			toast.error("Failed to start cleanup task");
		},
	});

	const form = useAppForm({
		defaultValues: settings,
		validators: {
			onSubmit: maintenanceSchema,
		},
		onSubmit: ({ value }) => updateMutation.mutate(value),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Maintenance Mode</CardTitle>
				<CardDescription>
					Enable maintenance mode to temporarily disable the site.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.AppField name="enabled">
						{(field) => (
							<field.SwitchField
								label="Maintenance Mode"
								description="When enabled, users will see the maintenance message"
							/>
						)}
					</form.AppField>

					<form.AppField name="message">
						{(field) => <field.TextArea label="Maintenance Message" rows={3} />}
					</form.AppField>

					<form.AppField name="allowed_ips">
						{(field) => (
							<field.TextField
								label="Allowed IPs"
								placeholder="127.0.0.1, 192.168.1.1"
								description="Comma-separated IPs that can bypass maintenance mode"
							/>
						)}
					</form.AppField>

					<form.AppForm>
						<form.SubscribeButton label="Save Changes" />
					</form.AppForm>
				</form>

				{/* Quick Actions - outside form */}
				<div className="space-y-3 border-t pt-4">
					<Label className="text-base font-medium">Quick Actions</Label>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => actionMutation.mutate("clear_cache")}
							disabled={actionMutation.isPending}
						>
							Clear Cache
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => actionMutation.mutate("clear_sessions")}
							disabled={actionMutation.isPending}
						>
							Clear All Sessions
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => actionMutation.mutate("test_email")}
							disabled={actionMutation.isPending}
						>
							Test Email
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => cleanupMutation.mutate()}
							disabled={cleanupMutation.isPending}
						>
							{cleanupMutation.isPending
								? "Starting..."
								: "Clean Orphaned Files"}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
