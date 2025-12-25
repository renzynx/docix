import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { adminListTagsQueryOptions } from "@/lib/api";
import {
	getQueryClient,
	getRequestHeaders,
	HydrateClient,
} from "@/lib/tanstack-query/server";
import { CreateSeriesForm } from "./_components/create-series-form";

export default async function NewSeriesPage() {
	const queryClient = getQueryClient();
	const headers = await getRequestHeaders();

	// Prefetch tags for the form
	await queryClient.prefetchQuery(adminListTagsQueryOptions({ headers }));

	return (
		<HydrateClient>
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						nativeButton={false}
						render={<Link href="/series" />}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Create Series</h1>
						<p className="text-muted-foreground">
							Add a new manga, manhwa, or webtoon series.
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Series Details</CardTitle>
						<CardDescription>
							Fill in the information for the new series.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateSeriesForm />
					</CardContent>
				</Card>
			</div>
		</HydrateClient>
	);
}
