"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { IntegrationsConfig } from "@docix/types";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface IntegrationsSettingsProps {
	settings: IntegrationsConfig;
}

export function IntegrationsSettings({ settings }: IntegrationsSettingsProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		smtp_host: settings.smtp_host,
		smtp_port: settings.smtp_port,
		smtp_username: settings.smtp_username,
		smtp_password: "", // Never pre-filled
		smtp_from_email: settings.smtp_from_email,
		smtp_from_name: settings.smtp_from_name,
		smtp_enabled: settings.smtp_enabled,
		cdn_enabled: settings.cdn_enabled,
		cdn_base_url: settings.cdn_base_url,
	});

	const mutation = useMutation({
		mutationFn: () =>
			adminUpdateSiteSettings({
				integrations: {
					smtp_host: form.smtp_host,
					smtp_port: form.smtp_port,
					smtp_username: form.smtp_username,
					smtp_password: form.smtp_password || undefined,
					smtp_from_email: form.smtp_from_email,
					smtp_from_name: form.smtp_from_name,
					smtp_enabled: form.smtp_enabled,
					cdn_enabled: form.cdn_enabled,
					cdn_base_url: form.cdn_base_url,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			setForm((prev) => ({ ...prev, smtp_password: "" }));
			toast.success("Integration settings updated");
		},
		onError: () => {
			toast.error("Failed to update settings");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		mutation.mutate();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Integrations</CardTitle>
				<CardDescription>
					Configure email, CDN, and other external service settings.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* SMTP Settings */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">SMTP Email</Label>
								<p className="text-sm text-muted-foreground">
									Configure email sending for notifications
								</p>
							</div>
							<Switch
								checked={form.smtp_enabled}
								onCheckedChange={(checked) =>
									setForm({ ...form, smtp_enabled: checked })
								}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="smtpHost">SMTP Host</Label>
								<Input
									id="smtpHost"
									value={form.smtp_host}
									onChange={(e) =>
										setForm({ ...form, smtp_host: e.target.value })
									}
									placeholder="smtp.example.com"
									disabled={!form.smtp_enabled}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="smtpPort">SMTP Port</Label>
								<Input
									id="smtpPort"
									type="number"
									value={form.smtp_port}
									onChange={(e) =>
										setForm({
											...form,
											smtp_port: Number.parseInt(e.target.value, 10) || 587,
										})
									}
									disabled={!form.smtp_enabled}
								/>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="smtpUser">Username</Label>
								<Input
									id="smtpUser"
									value={form.smtp_username}
									onChange={(e) =>
										setForm({ ...form, smtp_username: e.target.value })
									}
									disabled={!form.smtp_enabled}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="smtpPass">Password</Label>
								<Input
									id="smtpPass"
									type="password"
									value={form.smtp_password}
									onChange={(e) =>
										setForm({ ...form, smtp_password: e.target.value })
									}
									placeholder="Leave empty to keep current"
									disabled={!form.smtp_enabled}
								/>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="fromEmail">From Email</Label>
								<Input
									id="fromEmail"
									type="email"
									value={form.smtp_from_email}
									onChange={(e) =>
										setForm({ ...form, smtp_from_email: e.target.value })
									}
									placeholder="noreply@example.com"
									disabled={!form.smtp_enabled}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="fromName">From Name</Label>
								<Input
									id="fromName"
									value={form.smtp_from_name}
									onChange={(e) =>
										setForm({ ...form, smtp_from_name: e.target.value })
									}
									placeholder="Docix"
									disabled={!form.smtp_enabled}
								/>
							</div>
						</div>
					</div>

					{/* CDN Settings */}
					<div className="space-y-4 border-t pt-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">CDN</Label>
								<p className="text-sm text-muted-foreground">
									Content delivery network for images
								</p>
							</div>
							<Switch
								checked={form.cdn_enabled}
								onCheckedChange={(checked) =>
									setForm({ ...form, cdn_enabled: checked })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="cdnUrl">CDN Base URL</Label>
							<Input
								id="cdnUrl"
								value={form.cdn_base_url}
								onChange={(e) =>
									setForm({ ...form, cdn_base_url: e.target.value })
								}
								placeholder="https://cdn.example.com"
								disabled={!form.cdn_enabled}
							/>
						</div>
					</div>

					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
