/* eslint-disable @next/next/no-img-element */
"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type SeriesGridProps = {
  series:
    | (typeof api.series.getAllSeries)["_returnType"]
    | (typeof api.series.getSeriesByGenre)["_returnType"]
    | undefined
    | null;
  loadMore?: () => void;
  status?: "CanLoadMore" | "LoadingMore" | "Exhausted";
};

export const SeriesGrid = ({ series, loadMore, status }: SeriesGridProps) => {
  const items = series ? (Array.isArray(series) ? series : series.page) : [];

  const isLoadingMore = status === "LoadingMore";

  const canLoadMore = status
    ? status === "CanLoadMore"
    : series && !Array.isArray(series) && !series.isDone;

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No series available yet. Check back soon!
      </div>
    );
  }

  const getStatusColor = (statusValue: string) => {
    const colors = {
      ongoing: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      completed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      hiatus: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    };
    return colors[statusValue as keyof typeof colors] || colors.ongoing;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <div
            key={item._id}
            className="group relative overflow-hidden rounded-lg transition-all hover:shadow-lg h-full"
          >
            {/* Main Series Link - Covers the card but sits below interactive elements */}
            <Link
              href={`/series/${item.slug}`}
              className="absolute inset-0 z-10"
              prefetch={false}
            >
              <span className="sr-only">View {item.title}</span>
            </Link>

            <div className="relative aspect-[2/3] bg-muted overflow-hidden">
              {item.coverImageUrl ? (
                <img
                  src={item.coverImageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                  <span className="text-muted-foreground text-sm">
                    No cover
                  </span>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

              {/* Status badge */}
              <div className="absolute top-2 right-2 z-20 pointer-events-none">
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>

              {/* Content at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-3 text-white z-20 pointer-events-none flex flex-col justify-end">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1.5">
                  {item.title}
                </h3>

                {/* Genres */}
                {item.genreNames && item.genreNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.genreNames.slice(0, 2).map((genre, idx) => (
                      <Badge
                        key={`${genre}-${idx}`}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-5"
                      >
                        {genre}
                      </Badge>
                    ))}
                    {item.genreNames.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-5"
                      >
                        +{item.genreNames.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Latest Chapter Link - Interactive (pointer-events-auto) */}
                {item.latestChapter && (
                  <div className="flex items-center mt-1 pointer-events-auto">
                    <Link
                      href={`/series/${item.slug}/chapter-${item.latestChapter.chapterNumber}`}
                      className="group/chapter inline-flex"
                    >
                      <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary border-0 text-[10px] h-6 px-2 flex items-center gap-1.5 transition-colors">
                        <span className="font-semibold">
                          Ch. {item.latestChapter.chapterNumber}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/50" />
                        <span className="font-normal opacity-90">
                          {formatRelativeTime(item.latestChapter._creationTime)}
                        </span>
                      </Badge>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Button */}
      {canLoadMore && loadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="min-w-[150px]"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Series"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
