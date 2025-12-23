import type { Series, SeriesStatus } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Image } from "@docix/ui/components/image";
import { Skeleton } from "@docix/ui/components/skeleton";
import Link from "next/link";

interface SeriesCardProps {
	series: Series;
	showStatus?: boolean;
	showChapterCount?: boolean;
}

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

export function SeriesCard({
	series,
	showStatus = true,
	showChapterCount = true,
}: SeriesCardProps) {
	const status = getStatusConfig(series.status);

	return (
		<Link href={`/series/${series.slug}`} className="group flex flex-col gap-2">
			{/* Cover Image Container */}
			<div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
				{series.cover_image_url ? (
					<Image
						src={series.cover_image_url}
						alt={series.title}
						className="size-full transition-transform duration-300 group-hover:scale-105"
						fallback={<span className="text-xs">No Cover</span>}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
						<span className="text-xs">No Cover</span>
					</div>
				)}

				{/* Status Badge Overlay */}
				{showStatus && (
					<div className="absolute left-2 top-2 z-10">
						<Badge variant={status.variant} className="text-[10px]">
							{status.label}
						</Badge>
					</div>
				)}
			</div>

			{/* Title and Meta */}
			<div className="flex flex-col gap-0.5 px-0.5">
				<h3 className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-primary transition-colors">
					{series.title}
				</h3>
				{showChapterCount && (
					<p className="text-xs text-muted-foreground">
						{series.chapter_count > 0
							? `Ch. ${series.chapter_count}`
							: "No chapters"}
					</p>
				)}
			</div>
		</Link>
	);
}

export function SeriesCardSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{/* Cover Skeleton */}
			<Skeleton className="aspect-[2/3] w-full rounded-lg" />
			{/* Title Skeleton */}
			<div className="flex flex-col gap-1 px-0.5">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-1/3" />
			</div>
		</div>
	);
}
