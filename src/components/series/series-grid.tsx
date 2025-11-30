"use client";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SeriesCard } from "./series-card";
import { Doc, Id } from "@convex/_generated/dataModel";

type SeriesItem = {
  _id: Id<"series">;
  _creationTime: number;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
  genreNames: string[];
  latestChapter?: {
    _id: Id<"chapters">;
    chapterNumber: number;
    _creationTime: number;
  } | null;
};

type SeriesGridProps = {
  series:
    | { page: SeriesItem[]; totalCount?: number }
    | SeriesItem[]
    | undefined
    | null
    | any;
  loadMore?: () => void;
  status?: "CanLoadMore" | "LoadingMore" | "Exhausted";
};

export const SeriesGrid = ({ series, loadMore, status }: SeriesGridProps) => {
  let items: SeriesItem[] = [];
  let isDone = true;

  if (series) {
    if (Array.isArray(series)) {
      items = series;
      isDone = true;
    } else if ("page" in series && Array.isArray(series.page)) {
      items = series.page;
      isDone = true;
    }
  }

  const isLoadingMore = status === "LoadingMore";

  const canLoadMore = status ? status === "CanLoadMore" : false;

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No series available yet. Check back soon!
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3 md:gap-4">
        {items.map((item) => (
          <SeriesCard key={item._id} series={item} />
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
