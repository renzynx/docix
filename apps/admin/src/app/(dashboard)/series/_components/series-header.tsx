import type { Series } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import {
	BookOpen01Icon,
	Delete02Icon,
	PencilEdit01Icon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { getStatusColor } from "./constants";

interface SeriesHeaderProps {
	series: Series;
	onDelete: () => void;
}

export function SeriesHeader({ series, onDelete }: SeriesHeaderProps) {
	return (
		<div className="flex items-start justify-between">
			<div className="flex gap-6">
				{series.cover_image_url || series.cover_image ? (
					<img
						src={series.cover_image_url || series.cover_image}
						alt={series.title}
						className="h-40 w-28 rounded-lg object-cover shadow-lg"
					/>
				) : (
					<div className="h-40 w-28 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
						No Cover
					</div>
				)}
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight">
							{series.title}
						</h1>
						<Badge variant={getStatusColor(series.status)}>
							{series.status}
						</Badge>
					</div>
					{(series.author || series.artist) && (
						<p className="text-muted-foreground">
							{series.author && `By ${series.author}`}
							{series.author &&
								series.artist &&
								series.author !== series.artist &&
								` • Art by ${series.artist}`}
						</p>
					)}
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<HugeiconsIcon icon={BookOpen01Icon} className="size-4" />
							{series.chapter_count} chapters
						</span>
						<span>•</span>
						<span className="flex items-center gap-1.5">
							<HugeiconsIcon icon={ViewIcon} className="size-4" />
							{series.view_count.toLocaleString()} views
						</span>
					</div>
					{series.tags && series.tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5 pt-2">
							{series.tags.map((tag) => (
								<Badge key={tag.id} variant="outline">
									{tag.name}
								</Badge>
							))}
						</div>
					)}
				</div>
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href={`/series/${series.id}/edit`} />}
				>
					<HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
					Edit Series
				</Button>
				<Button variant="destructive" onClick={onDelete}>
					<HugeiconsIcon icon={Delete02Icon} className="size-4" />
					Delete
				</Button>
			</div>
		</div>
	);
}
