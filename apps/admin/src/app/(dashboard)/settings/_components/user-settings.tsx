"use client";

import { adminUpdateSiteSettings, queryKeys } from "@docix/api";
import type { UserConfig } from "@docix/types";
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

interface UserSettingsProps {
	settings: UserConfig;
}

export function UserSettings({ settings }: UserSettingsProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<UserConfig>(settings);

	const mutation = useMutation({
		mutationFn: () => adminUpdateSiteSettings({ users: form }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("User settings updated");
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
				<CardTitle>User Settings</CardTitle>
				<CardDescription>
					Configure registration, authentication, and user management options.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Registration Open</Label>
								<p className="text-sm text-muted-foreground">
									Allow new users to register
								</p>
							</div>
							<Switch
								checked={form.registration_open}
								onCheckedChange={(checked) =>
									setForm({ ...form, registration_open: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Require Email Verification</Label>
								<p className="text-sm text-muted-foreground">
									Users must verify their email before accessing all features
								</p>
							</div>
							<Switch
								checked={form.require_email_verification}
								onCheckedChange={(checked) =>
									setForm({ ...form, require_email_verification: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Allow Username Change</Label>
								<p className="text-sm text-muted-foreground">
									Users can change their username after registration
								</p>
							</div>
							<Switch
								checked={form.allow_username_change}
								onCheckedChange={(checked) =>
									setForm({ ...form, allow_username_change: checked })
								}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="maxAttempts">Max Login Attempts</Label>
						<Input
							id="maxAttempts"
							type="number"
							min={1}
							max={20}
							value={form.max_login_attempts}
							onChange={(e) =>
								setForm({
									...form,
									max_login_attempts: Number.parseInt(e.target.value, 10) || 5,
								})
							}
						/>
						<p className="text-xs text-muted-foreground">
							Before temporary lockout
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultRole">Default Role ID</Label>
						<Input
							id="defaultRole"
							value={form.default_role_id}
							onChange={(e) =>
								setForm({ ...form, default_role_id: e.target.value })
							}
							placeholder="Leave empty for no default role"
						/>
						<p className="text-xs text-muted-foreground">
							Role automatically assigned to new users
						</p>
					</div>

					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
