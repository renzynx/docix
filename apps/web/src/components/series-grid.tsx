import type { Series } from "@docix/types";
import { SeriesCard, SeriesCardSkeleton } from "./series-card";

interface SeriesGridProps {
	series: Series[];
	/** Show status badge on cards (default: true) */
	showStatus?: boolean;
	/** Show chapter count on cards (default: true) */
	showChapterCount?: boolean;
}

/**
 * Responsive grid for displaying series cards.
 * - Mobile: 2 columns
 * - Tablet (sm): 3 columns
 * - Medium (md): 4 columns
 * - Large (lg): 5 columns
 * - XL: 6 columns
 */
export function SeriesGrid({
	series,
	showStatus = true,
	showChapterCount = true,
}: SeriesGridProps) {
	if (series.length === 0) {
		return (
			<div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
				<p className="text-muted-foreground">No series found</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{series.map((s) => (
				<SeriesCard
					key={s.id}
					series={s}
					showStatus={showStatus}
					showChapterCount={showChapterCount}
				/>
			))}
		</div>
	);
}

interface SeriesGridSkeletonProps {
	/** Number of skeleton cards to show (default: 12) */
	count?: number;
}

/**
 * Loading skeleton for SeriesGrid
 */
export function SeriesGridSkeleton({ count = 12 }: SeriesGridSkeletonProps) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{Array.from({ length: count }).map((_, i) => (
				<SeriesCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}
