import { Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface MaintenancePageProps {
	message?: string;
	siteName?: string;
}

export function MaintenancePage({
	message = "We are currently performing maintenance. Please check back soon.",
	siteName = "Docix",
}: MaintenancePageProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
			<div className="mx-auto max-w-md text-center">
				<div className="mb-6 flex justify-center">
					<div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
						<HugeiconsIcon
							icon={Settings02Icon}
							className="h-12 w-12 text-amber-600 dark:text-amber-400"
						/>
					</div>
				</div>

				<h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
					Under Maintenance
				</h1>

				<p className="mb-6 text-muted-foreground">{message}</p>

				<div className="rounded-lg border border-border bg-card p-4">
					<p className="text-sm text-muted-foreground">
						We apologize for the inconvenience. {siteName} will be back online
						shortly.
					</p>
				</div>
			</div>
		</div>
	);
}
