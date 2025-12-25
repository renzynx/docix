"use client";

import type { ContentConfig } from "@docix/types";
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
import { adminUpdateSiteSettings, queryKeys } from "@docix/api";

interface ContentSettingsProps {
	settings: ContentConfig;
}

export function ContentSettings({ settings }: ContentSettingsProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<ContentConfig>(settings);

	const mutation = useMutation({
		mutationFn: () => adminUpdateSiteSettings({ content: form }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("Content settings updated");
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
				<CardTitle>Content Settings</CardTitle>
				<CardDescription>
					Configure upload limits, content rules, and moderation settings.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="maxUpload">Max Upload Size (MB)</Label>
							<Input
								id="maxUpload"
								type="number"
								min={1}
								value={form.max_upload_size_mb}
								onChange={(e) =>
									setForm({
										...form,
										max_upload_size_mb:
											Number.parseInt(e.target.value, 10) || 1,
									})
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="maxChapters">Max Chapters Per Day</Label>
							<Input
								id="maxChapters"
								type="number"
								min={1}
								value={form.max_chapters_per_day}
								onChange={(e) =>
									setForm({
										...form,
										max_chapters_per_day:
											Number.parseInt(e.target.value, 10) || 1,
									})
								}
							/>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="imageTypes">Allowed Image Types</Label>
							<Input
								id="imageTypes"
								value={form.allowed_image_types}
								onChange={(e) =>
									setForm({ ...form, allowed_image_types: e.target.value })
								}
								placeholder="jpg,jpeg,png,webp,gif"
							/>
							<p className="text-xs text-muted-foreground">
								Comma-separated list of extensions
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="rating">Default Content Rating</Label>
							<Input
								id="rating"
								value={form.default_content_rating}
								onChange={(e) =>
									setForm({ ...form, default_content_rating: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Enable Comments</Label>
								<p className="text-sm text-muted-foreground">
									Allow users to comment on series and chapters
								</p>
							</div>
							<Switch
								checked={form.enable_comments}
								onCheckedChange={(checked) =>
									setForm({ ...form, enable_comments: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Require Moderation</Label>
								<p className="text-sm text-muted-foreground">
									New content requires approval before publishing
								</p>
							</div>
							<Switch
								checked={form.require_moderation}
								onCheckedChange={(checked) =>
									setForm({ ...form, require_moderation: checked })
								}
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
