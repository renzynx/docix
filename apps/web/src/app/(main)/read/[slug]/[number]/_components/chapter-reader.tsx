"use client";

import { getChapterQueryOptions } from "@docix/api";
import { Button } from "@docix/ui/components/button";
import { Image } from "@docix/ui/components/image";
import {
	ArrowLeft02Icon,
	ArrowRight02Icon,
	Home01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReaderAffix } from "./reader-affix";

interface ChapterReaderProps {
	slug: string;
	number: string;
}

export function ChapterReader({ slug, number }: ChapterReaderProps) {
	const { data } = useSuspenseQuery(getChapterQueryOptions(slug, number));

	const {
		chapter,
		series_title,
		series_slug,
		total_chapters,
		pages,
		prev_chapter,
		next_chapter,
	} = data;

	const chapterTitle = chapter.title
		? `Ch. ${chapter.number}: ${chapter.title}`
		: `Chapter ${chapter.number}`;

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
				<div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
					<div className="flex items-center gap-3 min-w-0">
						<Button
							variant="ghost"
							size="icon"
							nativeButton={false}
							render={<Link href={`/series/${series_slug}`} />}
						>
							<HugeiconsIcon icon={Home01Icon} size={18} />
						</Button>
						<div className="min-w-0">
							<Link
								href={`/series/${series_slug}`}
								className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
							>
								{series_title}
							</Link>
							<p className="text-xs text-muted-foreground">{chapterTitle}</p>
						</div>
					</div>

					{/* Chapter Navigation */}
					<div className="flex items-center gap-2">
						{prev_chapter ? (
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={
									<Link href={`/read/${series_slug}/${prev_chapter.number}`} />
								}
							>
								<HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
								<span className="hidden sm:inline">Prev</span>
							</Button>
						) : (
							<Button variant="outline" size="sm" disabled>
								<HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
								<span className="hidden sm:inline">Prev</span>
							</Button>
						)}

						{next_chapter ? (
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={
									<Link href={`/read/${series_slug}/${next_chapter.number}`} />
								}
							>
								<span className="hidden sm:inline">Next</span>
								<HugeiconsIcon icon={ArrowRight02Icon} size={16} />
							</Button>
						) : (
							<Button variant="outline" size="sm" disabled>
								<span className="hidden sm:inline">Next</span>
								<HugeiconsIcon icon={ArrowRight02Icon} size={16} />
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Pages (Webtoon Mode - Vertical Scroll) */}
			<div className="flex flex-col items-center bg-black min-h-screen">
				{pages.length === 0 ? (
					<div className="flex h-60 w-full items-center justify-center">
						<p className="text-muted-foreground">No pages available</p>
					</div>
				) : (
					pages.map((page) => (
						<Image
							key={page.id}
							src={page.image_url_signed || page.image_url}
							alt={`Page ${page.number}`}
							className="w-full max-w-4xl"
							skeletonClassName="bg-zinc-800"
							fallback={
								<span className="text-muted-foreground">
									Failed to load page {page.number}
								</span>
							}
						/>
					))
				)}
			</div>

			{/* Footer Navigation */}
			<div className="bg-background border-t pb-16 sm:pb-0">
				<div className="flex items-center justify-between px-2 sm:px-4 py-3 sm:py-4 max-w-4xl mx-auto gap-2">
					{prev_chapter ? (
						<Button
							variant="outline"
							size="sm"
							nativeButton={false}
							render={
								<Link href={`/read/${series_slug}/${prev_chapter.number}`} />
							}
							className="flex-1 sm:flex-none"
						>
							<HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
							<span className="hidden sm:inline">Previous</span>
							<span className="sm:hidden">Prev</span>
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							disabled
							className="flex-1 sm:flex-none"
						>
							<HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
							<span className="hidden sm:inline">Previous</span>
							<span className="sm:hidden">Prev</span>
						</Button>
					)}

					<Button
						variant="secondary"
						size="sm"
						nativeButton={false}
						render={<Link href={`/series/${series_slug}`} />}
						className="flex-1 sm:flex-none"
					>
						<span className="hidden sm:inline">Back to Series</span>
						<span className="sm:hidden">Home</span>
					</Button>

					{next_chapter ? (
						<Button
							variant="outline"
							size="sm"
							nativeButton={false}
							render={
								<Link href={`/read/${series_slug}/${next_chapter.number}`} />
							}
							className="flex-1 sm:flex-none"
						>
							<span className="hidden sm:inline">Next</span>
							<span className="sm:hidden">Next</span>
							<HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							disabled
							className="flex-1 sm:flex-none"
						>
							<span className="hidden sm:inline">Next</span>
							<span className="sm:hidden">Next</span>
							<HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Floating Affix */}
			<ReaderAffix
				seriesSlug={series_slug}
				currentChapter={chapter.number}
				prevChapter={prev_chapter}
				nextChapter={next_chapter}
				totalChapters={total_chapters}
			/>
		</div>
	);
}
