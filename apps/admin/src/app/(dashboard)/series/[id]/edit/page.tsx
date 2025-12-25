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
import { notFound } from "next/navigation";
import {
	adminGetSeriesQueryOptions,
	adminListTagsQueryOptions,
} from "@docix/api";
import {
	getQueryClient,
	getRequestHeaders,
	HydrateClient,
} from "@/lib/tanstack-query/server";
import { EditSeriesForm } from "./_components/edit-series-form";

interface EditSeriesPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
	const { id } = await params;
	const queryClient = getQueryClient();
	const headers = await getRequestHeaders();

	// Prefetch series and tags in parallel
	const [series] = await Promise.all([
		queryClient.fetchQuery(adminGetSeriesQueryOptions(id, { headers })),
		queryClient.prefetchQuery(adminListTagsQueryOptions({ headers })),
	]);

	if (!series) {
		notFound();
	}

	return (
		<HydrateClient>
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						nativeButton={false}
						render={<Link href={`/series/${id}`} />}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Edit Series</h1>
						<p className="text-muted-foreground">
							Update details for "{series.title}"
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Series Details</CardTitle>
						<CardDescription>
							Make changes to the series information below.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<EditSeriesForm seriesId={id} />
					</CardContent>
				</Card>
			</div>
		</HydrateClient>
	);
}
