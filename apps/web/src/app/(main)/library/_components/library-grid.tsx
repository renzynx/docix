"use client";

import { api, queryKeys } from "@docix/api";
import type { Series } from "@docix/types";
import { Skeleton } from "@docix/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { SeriesCard } from "@/components/series-card";
import { useSession } from "@/hooks/use-session";

interface BookmarkWithSeries {
	id: string;
	series_id: string;
	series: Series;
	created_at: string;
}

export function LibraryGrid() {
	const { data: session, isLoading: isSessionLoading } = useSession();

	const { data: bookmarks, isLoading } = useQuery({
		queryKey: queryKeys.bookmarks,
		queryFn: async () => {
			const { data } = await api.get<BookmarkWithSeries[]>("/bookmarks");
			return data;
		},
		enabled: !!session?.user,
	});

	if (isSessionLoading) {
		return <LibrarySkeleton />;
	}

	if (!session?.user) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<p className="text-muted-foreground mb-4">
					Sign in to access your library
				</p>
				<Link
					href="/auth/sign-in"
					className="text-primary hover:underline font-medium"
				>
					Sign In
				</Link>
			</div>
		);
	}

	if (isLoading) {
		return <LibrarySkeleton />;
	}

	if (!bookmarks || bookmarks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="text-6xl mb-4">📚</div>
				<h2 className="text-xl font-semibold mb-2">Your library is empty</h2>
				<p className="text-muted-foreground mb-4">
					Start bookmarking series to build your reading list
				</p>
				<Link
					href="/browse"
					className="text-primary hover:underline font-medium"
				>
					Browse Series
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{bookmarks.length} {bookmarks.length === 1 ? "series" : "series"} in
					your library
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{bookmarks.map((bookmark) => (
					<div key={bookmark.id} className="group relative">
						<SeriesCard series={bookmark.series} />
						<p className="text-xs text-muted-foreground mt-1 text-center">
							Added{" "}
							{formatDistanceToNow(new Date(bookmark.created_at), {
								addSuffix: true,
							})}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

function LibrarySkeleton() {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{Array.from({ length: 12 }).map((_, i) => (
				<div key={i} className="space-y-2">
					<Skeleton className="aspect-[2/3] rounded-lg" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	);
}
