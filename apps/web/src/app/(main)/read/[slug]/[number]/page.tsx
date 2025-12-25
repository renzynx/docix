import { getChapterQueryOptions } from "@docix/api";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChapter } from "@/lib/api.server";
import {
	getQueryClient,
	getRequestHeaders,
	HydrateClient,
} from "@/lib/tanstack-query/server";
import { ChapterReader } from "./_components/chapter-reader";

interface PageProps {
	params: Promise<{ slug: string; number: string }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug, number } = await params;

	try {
		// Uses React cache() - will be deduplicated with page fetch
		const data = await getChapter(slug, number);

		const chapterTitle = data.chapter.title
			? `Ch. ${data.chapter.number}: ${data.chapter.title}`
			: `Chapter ${data.chapter.number}`;

		return {
			title: `${chapterTitle} - ${data.series_title}`,
			description: `Read ${chapterTitle} of ${data.series_title} on Docix`,
		};
	} catch {
		return {
			title: "Chapter Not Found",
		};
	}
}

export default async function ReaderPage({ params }: PageProps) {
	const { slug, number } = await params;
	const queryClient = getQueryClient();
	const headers = await getRequestHeaders();

	try {
		// Prefetch for hydration - useSuspenseQuery will use this data
		await queryClient.prefetchQuery(
			getChapterQueryOptions(slug, number, { headers }),
		);
	} catch {
		notFound();
	}

	return (
		<HydrateClient>
			<ChapterReader slug={slug} number={number} />
		</HydrateClient>
	);
}
