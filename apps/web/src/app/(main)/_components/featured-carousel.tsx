"use client";

import type { Series } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@docix/ui/components/carousel";
import { Image } from "@docix/ui/components/image";
import { Skeleton } from "@docix/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { useRef } from "react";
import { listSeriesQueryOptions } from "@/lib/api.generated";

export function FeaturedCarousel() {
	const { data, isPending, isError } = useQuery(
		listSeriesQueryOptions({ limit: 5, sort: "popular" }),
	);

	const autoplayPlugin = useRef(
		Autoplay({ delay: 5000, stopOnInteraction: true }),
	);

	if (isPending) {
		return <FeaturedCarouselSkeleton />;
	}

	if (isError || !data?.data?.length) {
		return null;
	}

	return (
		<section className="relative">
			<Carousel
				opts={{ loop: true, align: "start" }}
				plugins={[autoplayPlugin.current]}
				className="w-full"
			>
				<CarouselContent>
					{data.data.map((series) => (
						<CarouselItem key={series.id}>
							<FeaturedSlide series={series} />
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious className="left-4 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 focus:opacity-100" />
				<CarouselNext className="right-4 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 focus:opacity-100" />
			</Carousel>
		</section>
	);
}

function FeaturedSlide({ series }: { series: Series }) {
	return (
		<Link
			href={`/series/${series.slug}`}
			className="group relative block w-full overflow-hidden rounded-xl"
		>
			{/* Background with gradient overlay */}
			<div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
				{series.cover_image_url && (
					<Image
						src={series.cover_image_url}
						alt={series.title}
						className="size-full object-cover opacity-30 blur-sm scale-110"
						fallback={null}
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
				<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
			</div>

			{/* Content */}
			<div className="absolute inset-0 flex items-center">
				<div className="flex gap-6 p-6 md:p-10 lg:p-12">
					{/* Cover Image */}
					<div className="relative hidden sm:block flex-shrink-0 w-32 md:w-40 lg:w-48 aspect-[2/3] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
						{series.cover_image_url ? (
							<Image
								src={series.cover_image_url}
								alt={series.title}
								className="size-full transition-transform duration-500 group-hover:scale-105"
								fallback={
									<div className="flex size-full items-center justify-center bg-muted">
										<span className="text-xs text-muted-foreground">
											No Cover
										</span>
									</div>
								}
							/>
						) : (
							<div className="flex size-full items-center justify-center bg-muted">
								<span className="text-xs text-muted-foreground">No Cover</span>
							</div>
						)}
					</div>

					{/* Text Content */}
					<div className="flex flex-col justify-center gap-3 max-w-xl">
						<div className="flex items-center gap-2">
							<Badge variant="default" className="text-xs">
								Featured
							</Badge>
							{series.status && (
								<Badge variant="secondary" className="text-xs capitalize">
									{series.status}
								</Badge>
							)}
						</div>

						<h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
							{series.title}
						</h2>

						{series.description && (
							<p className="text-sm md:text-base text-muted-foreground line-clamp-2 md:line-clamp-3">
								{series.description}
							</p>
						)}

						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							{series.author && <span>By {series.author}</span>}
							{series.chapter_count > 0 && (
								<span>{series.chapter_count} Chapters</span>
							)}
							{series.view_count > 0 && (
								<span>{series.view_count.toLocaleString()} Views</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

function FeaturedCarouselSkeleton() {
	return (
		<section>
			<div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl bg-muted">
				<div className="absolute inset-0 flex items-center">
					<div className="flex gap-6 p-6 md:p-10 lg:p-12">
						<Skeleton className="hidden sm:block w-32 md:w-40 lg:w-48 aspect-[2/3] rounded-lg" />
						<div className="flex flex-col justify-center gap-3 max-w-xl">
							<div className="flex gap-2">
								<Skeleton className="h-5 w-20" />
								<Skeleton className="h-5 w-16" />
							</div>
							<Skeleton className="h-10 w-80" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<div className="flex gap-4">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
