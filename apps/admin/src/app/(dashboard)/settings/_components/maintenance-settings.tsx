"use client";

import {
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
import { Input } from "@docix/ui/components/input";
import { Label } from "@docix/ui/components/label";
import { Switch } from "@docix/ui/components/switch";
import { Textarea } from "@docix/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface MaintenanceSettingsProps {
	settings: MaintenanceConfig;
}

export function MaintenanceSettings({ settings }: MaintenanceSettingsProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<MaintenanceConfig>(settings);

	const updateMutation = useMutation({
		mutationFn: () => adminUpdateSiteSettings({ maintenance: form }),
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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateMutation.mutate();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Maintenance Mode</CardTitle>
				<CardDescription>
					Enable maintenance mode to temporarily disable the site.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Maintenance Mode</Label>
							<p className="text-sm text-muted-foreground">
								When enabled, users will see the maintenance message
							</p>
						</div>
						<Switch
							checked={form.enabled}
							onCheckedChange={(checked) =>
								setForm({ ...form, enabled: checked })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="message">Maintenance Message</Label>
						<Textarea
							id="message"
							value={form.message}
							onChange={(e) => setForm({ ...form, message: e.target.value })}
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="allowedIps">Allowed IPs</Label>
						<Input
							id="allowedIps"
							value={form.allowed_ips}
							onChange={(e) =>
								setForm({ ...form, allowed_ips: e.target.value })
							}
							placeholder="127.0.0.1, 192.168.1.1"
						/>
						<p className="text-xs text-muted-foreground">
							Comma-separated IPs that can bypass maintenance mode
						</p>
					</div>

					<Button type="submit" disabled={updateMutation.isPending}>
						{updateMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</form>

				{/* Quick Actions */}
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
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
