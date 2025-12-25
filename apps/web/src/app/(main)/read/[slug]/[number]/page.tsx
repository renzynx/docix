import { getChapter } from "@/lib/api.server";
import {
	HydrateClient,
	getQueryClient,
	getRequestHeaders,
} from "@/lib/tanstack-query/server";
import { getChapterQueryOptions } from "@docix/api";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterReader } from "./_components/chapter-reader";

interface PageProps {
	params: Promise<{ slug: string; number: string }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug, number } = await params;

	try {
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
