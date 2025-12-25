"use client";

import type { BookmarkStatusResponse, SeriesStatus } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import { Image } from "@docix/ui/components/image";
import {
	Book02Icon,
	Bookmark01Icon,
	BookmarkCheck01Icon,
	Calendar03Icon,
	User03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import {
	getBookmarkStatusQueryOptions,
	getSeriesBySlugQueryOptions,
	queryKeys,
	toggleBookmark,
} from "@docix/api";

const statusConfig = {
	ongoing: { label: "Ongoing", variant: "default" },
	completed: { label: "Completed", variant: "secondary" },
	hiatus: { label: "Hiatus", variant: "outline" },
	cancelled: { label: "Cancelled", variant: "outline" },
} as const;

type StatusKey = keyof typeof statusConfig;

function getStatusConfig(status: SeriesStatus) {
	if (status in statusConfig) {
		return statusConfig[status as StatusKey];
	}
	return statusConfig.ongoing;
}

interface SeriesDetailProps {
	slug: string;
}

export function SeriesDetail({ slug }: SeriesDetailProps) {
	const { data } = useSuspenseQuery(getSeriesBySlugQueryOptions(slug));
	const { data: session } = useSession();
	const queryClient = useQueryClient();

	const { series, chapters } = data;
	const status = getStatusConfig(series.status);

	// Only fetch bookmark status if logged in and we have a valid series ID
	const { data: bookmarkStatus } = useQuery({
		...getBookmarkStatusQueryOptions(series.id),
		enabled: !!session?.user && !!series.id,
		retry: 0,
	});

	const bookmarkMutation = useMutation({
		mutationFn: () => toggleBookmark(series.id),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.bookmarkStatusDetail(series.id),
			});

			const previousStatus = queryClient.getQueryData<BookmarkStatusResponse>(
				queryKeys.bookmarkStatusDetail(series.id),
			);

			queryClient.setQueryData<BookmarkStatusResponse>(
				queryKeys.bookmarkStatusDetail(series.id),
				(old) => ({
					bookmarked: !old?.bookmarked,
					bookmark_id: old?.bookmarked ? undefined : "optimistic",
				}),
			);

			return { previousStatus };
		},
		onSuccess: (data) => {
			// Update cache with actual server response
			queryClient.setQueryData<BookmarkStatusResponse>(
				queryKeys.bookmarkStatusDetail(series.id),
				{ bookmarked: data.bookmarked, bookmark_id: data.bookmark_id },
			);
			// Invalidate bookmarks list (for the bookmarks page)
			queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
		},
		onError: (_err, _vars, context) => {
			// Rollback on error
			if (context?.previousStatus) {
				queryClient.setQueryData(
					queryKeys.bookmarkStatusDetail(series.id),
					context.previousStatus,
				);
			}
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.bookmarkStatusDetail(series.id),
			});
		},
	});

	const isBookmarked = bookmarkStatus?.bookmarked ?? false;

	// Chapters are sorted descending (latest first), so first = latest, last = first
	const firstChapter = chapters.at(-1);
	const latestChapter = chapters.at(0);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-6 sm:flex-row">
				<div className="relative aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-lg bg-muted self-center sm:self-start">
					{series.cover_image_url ? (
						<Image
							src={series.cover_image_url}
							alt={series.title}
							className="size-full"
							fallback={<span className="text-sm">No Cover</span>}
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-muted-foreground">
							<span className="text-sm">No Cover</span>
						</div>
					)}
				</div>

				<div className="flex flex-1 flex-col gap-4">
					<div>
						<div className="flex flex-wrap items-center gap-2 mb-2">
							<Badge variant={status.variant}>{status.label}</Badge>
							{series.tags?.map((tag) => (
								<Badge key={tag.id} variant="outline">
									{tag.name}
								</Badge>
							))}
						</div>
						<h1 className="text-2xl font-bold sm:text-3xl">{series.title}</h1>
					</div>

					<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
						{series.author && (
							<div className="flex items-center gap-1.5">
								<HugeiconsIcon icon={User03Icon} size={16} />
								<span>Author: {series.author}</span>
							</div>
						)}
						{series.artist && series.artist !== series.author && (
							<div className="flex items-center gap-1.5">
								<HugeiconsIcon icon={User03Icon} size={16} />
								<span>Artist: {series.artist}</span>
							</div>
						)}
						<div className="flex items-center gap-1.5">
							<HugeiconsIcon icon={Book02Icon} size={16} />
							<span>{series.chapter_count} Chapters</span>
						</div>
						<div className="flex items-center gap-1.5">
							<HugeiconsIcon icon={Calendar03Icon} size={16} />
							<span>
								Updated{" "}
								{formatDistanceToNow(new Date(series.updated_at), {
									addSuffix: true,
								})}
							</span>
						</div>
					</div>

					{series.description && (
						<p className="text-muted-foreground leading-relaxed">
							{series.description}
						</p>
					)}

					{chapters.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 pt-2">
							<Button
								nativeButton={false}
								render={
									<Link href={`/read/${slug}/${firstChapter?.number ?? 1}`} />
								}
							>
								Start Reading
							</Button>
							{latestChapter && latestChapter !== firstChapter && (
								<Button
									variant="outline"
									nativeButton={false}
									render={
										<Link href={`/read/${slug}/${latestChapter.number}`} />
									}
								>
									Read Latest (Ch. {latestChapter.number})
								</Button>
							)}
							{session?.user && (
								<Button
									variant={isBookmarked ? "secondary" : "outline"}
									onClick={() => bookmarkMutation.mutate()}
									disabled={bookmarkMutation.isPending}
								>
									<HugeiconsIcon
										icon={isBookmarked ? BookmarkCheck01Icon : Bookmark01Icon}
										size={18}
									/>
									{isBookmarked ? "Bookmarked" : "Bookmark"}
								</Button>
							)}
						</div>
					)}
				</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold mb-4">Chapters</h2>
				{chapters.length === 0 ? (
					<div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground">No chapters yet</p>
					</div>
				) : (
					<div className="grid gap-2">
						{chapters.map((chapter) => (
							<Link
								key={chapter.id}
								href={`/read/${slug}/${chapter.number}`}
								className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-2">
									<span className="font-medium">Chapter {chapter.number}</span>
									{chapter.title && (
										<span className="text-muted-foreground">
											- {chapter.title}
										</span>
									)}
								</div>
								<span className="text-xs text-muted-foreground">
									{formatDistanceToNow(new Date(chapter.created_at), {
										addSuffix: true,
									})}
								</span>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
