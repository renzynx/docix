"use client";

import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SeriesGrid, SeriesGridSkeleton } from "@/components/series-grid";
import {
	type ListSeriesParams,
	listSeriesQueryOptions,
} from "@/lib/api.generated";

interface SeriesSectionProps {
	title: string;
	href: string;
	params: ListSeriesParams;
	skeletonCount?: number;
}

function SeriesSection({
	title,
	href,
	params,
	skeletonCount = 6,
}: SeriesSectionProps) {
	const { data, isPending, isError } = useQuery(listSeriesQueryOptions(params));

	return (
		<section>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">{title}</h2>
				<Link
					href={href}
					className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
				>
					View All
					<HugeiconsIcon icon={ArrowRight02Icon} size={16} />
				</Link>
			</div>
			{isPending ? (
				<SeriesGridSkeleton count={skeletonCount} />
			) : isError || !data ? (
				<div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
					<p className="text-muted-foreground">
						Failed to load {title.toLowerCase()}
					</p>
				</div>
			) : (
				<SeriesGrid series={data.data} />
			)}
		</section>
	);
}

export function PopularSeriesSection() {
	return (
		<SeriesSection
			title="Popular"
			href="/browse?sort=popular"
			params={{ limit: 6, sort: "popular" }}
			skeletonCount={6}
		/>
	);
}

export function LatestSeriesSection() {
	return (
		<SeriesSection
			title="Latest Updates"
			href="/browse"
			params={{ limit: 12, sort: "latest" }}
			skeletonCount={12}
		/>
	);
}
