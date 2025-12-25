"use client";

import { Spinner } from "@docix/ui/components/spinner";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@docix/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { adminGetSiteSettingsQueryOptions } from "@/lib/api";
import {
	ContentSettings,
	IntegrationsSettings,
	MaintenanceSettings,
	SiteSettings,
	SystemInfoCard,
	UserSettings,
} from "./_components";

export default function SettingsPage() {
	const { data: settings, isLoading } = useQuery(
		adminGetSiteSettingsQueryOptions(),
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">Failed to load settings</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Manage site configuration and preferences.
				</p>
			</div>

			<Tabs defaultValue="site" className="space-y-6">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="site">Site</TabsTrigger>
					<TabsTrigger value="content">Content</TabsTrigger>
					<TabsTrigger value="users">Users</TabsTrigger>
					<TabsTrigger value="integrations">Integrations</TabsTrigger>
					<TabsTrigger value="maintenance">Maintenance</TabsTrigger>
				</TabsList>

				<TabsContent value="site">
					<SiteSettings settings={settings.site} />
				</TabsContent>

				<TabsContent value="content">
					<ContentSettings settings={settings.content} />
				</TabsContent>

				<TabsContent value="users">
					<UserSettings settings={settings.users} />
				</TabsContent>

				<TabsContent value="integrations">
					<IntegrationsSettings settings={settings.integrations} />
				</TabsContent>

				<TabsContent value="maintenance">
					<div className="grid gap-6 lg:grid-cols-2">
						<MaintenanceSettings settings={settings.maintenance} />
						<SystemInfoCard />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
