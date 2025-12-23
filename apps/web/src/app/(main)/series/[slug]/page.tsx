import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQueryClient, HydrateClient } from "@/lib/tanstack-query/server";
import { getSeriesBySlug } from "@/lib/api.server";
import { queryKeys } from "@/lib/api.generated";
import { SeriesDetail } from "./_components/series-detail";
import type { SeriesWithChapters } from "@docix/types";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;

	try {
		const data = await getSeriesBySlug(slug);

		return {
			title: data.series.title,
			description:
				data.series.description || `Read ${data.series.title} on Docix`,
		};
	} catch {
		return {
			title: "Series Not Found",
		};
	}
}

export default async function SeriesPage({ params }: PageProps) {
	const { slug } = await params;
	const queryClient = getQueryClient();

	let data: SeriesWithChapters;
	try {
		data = await getSeriesBySlug(slug);
	} catch {
		notFound();
	}

	queryClient.setQueryData(queryKeys.seriesBySlugDetail(slug), data);

	return (
		<HydrateClient>
			<SeriesDetail slug={slug} />
		</HydrateClient>
	);
}
