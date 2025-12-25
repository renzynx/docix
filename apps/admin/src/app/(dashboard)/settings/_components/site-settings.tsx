"use client";

import type { SiteConfig } from "@docix/types";
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
import { Textarea } from "@docix/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminUpdateSiteSettings, queryKeys } from "@/lib/api.generated";

interface SiteSettingsProps {
	settings: SiteConfig;
}

export function SiteSettings({ settings }: SiteSettingsProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<SiteConfig>(settings);

	const mutation = useMutation({
		mutationFn: () => adminUpdateSiteSettings({ site: form }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSiteSettings });
			toast.success("Site settings updated");
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
				<CardTitle>Site Configuration</CardTitle>
				<CardDescription>
					General site settings like name, description, and SEO metadata.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="name">Site Name</Label>
							<Input
								id="name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="locale">Default Locale</Label>
							<Input
								id="locale"
								value={form.default_locale}
								onChange={(e) =>
									setForm({ ...form, default_locale: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Site Description</Label>
						<Textarea
							id="description"
							value={form.description}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
							rows={3}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="logo">Logo URL</Label>
							<Input
								id="logo"
								value={form.logo_url}
								onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
								placeholder="https://..."
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="favicon">Favicon URL</Label>
							<Input
								id="favicon"
								value={form.favicon_url}
								onChange={(e) =>
									setForm({ ...form, favicon_url: e.target.value })
								}
								placeholder="https://..."
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="metaTitle">Meta Title</Label>
						<Input
							id="metaTitle"
							value={form.meta_title}
							onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="metaDescription">Meta Description</Label>
						<Textarea
							id="metaDescription"
							value={form.meta_description}
							onChange={(e) =>
								setForm({ ...form, meta_description: e.target.value })
							}
							rows={2}
						/>
					</div>

					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
