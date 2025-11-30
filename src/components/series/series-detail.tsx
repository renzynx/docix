/* eslint-disable @next/next/no-img-element */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Heart, Share2, ArrowDownUp } from "lucide-react";
import { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";

type ChapterWithExtras = Doc<"chapters"> & {
  pageCount?: number;
};

type SeriesWithChapters = Doc<"series"> & {
  coverImageUrl: string | null;
  genreNames: string[];
  chapters: ChapterWithExtras[];
};

type SeriesDetailProps = {
  data: SeriesWithChapters;
};

export const SeriesDetail = ({ data }: SeriesDetailProps) => {
  const { chapters, ...series } = data;
  const [isAscending, setIsAscending] = useState(false);

  // Favorites Logic
  const isFavorited = useQuery(api.series.getIsFavorited, {
    seriesId: series._id,
  });
  const toggleFav = useMutation(api.series.toggleFavorite);

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFav({ seriesId: series._id });
      toast.success(
        result.favorited ? "Added to favorites" : "Removed from favorites"
      );
    } catch (error) {
      toast.error("Failed to update favorites. Please try again.");
    }
  };

  if (!series) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Series not found
      </div>
    );
  }

  const getStatusColor = (statusValue: string) => {
    const colors = {
      ongoing: "bg-green-500/10 text-green-500 border-green-500/20",
      completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      hiatus: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[statusValue as keyof typeof colors] || colors.ongoing;
  };

  // Sorting chapters
  const sortedChapters = [...(chapters || [])].sort((a, b) => {
    return isAscending
      ? a.chapterNumber - b.chapterNumber
      : b.chapterNumber - a.chapterNumber;
  });

  // Find the actual first chapter (lowest number) for the "Start Reading" button
  const firstChapter =
    chapters && chapters.length > 0
      ? chapters.reduce((prev, current) =>
          prev.chapterNumber < current.chapterNumber ? prev : current
        )
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero / Header */}
      <div className="relative">
        {/* Backdrop Blur Layer */}
        <div className="absolute inset-0 h-64 md:h-80 overflow-hidden rounded-xl -z-10">
          {series.coverImageUrl && (
            <>
              <img
                src={series.coverImageUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-20 dark:opacity-30 scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 pt-8 md:px-8">
          {/* Cover Image */}
          <div className="relative group mx-auto md:mx-0 w-[200px] md:w-full">
            <div className="aspect-[2/3] bg-muted overflow-hidden rounded-xl shadow-2xl ring-1 ring-border/10">
              {series.coverImageUrl ? (
                <img
                  src={series.coverImageUrl}
                  alt={series.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                  <span className="text-muted-foreground text-sm">
                    No cover
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                {series.title}
              </h1>
              {series.author && (
                <p className="text-lg text-muted-foreground">
                  By{" "}
                  <span className="font-medium text-foreground">
                    {series.author}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize border",
                  getStatusColor(series.status)
                )}
              >
                {series.status}
              </Badge>
              {series.genreNames?.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="hover:bg-secondary/80"
                >
                  {genre}
                </Badge>
              ))}
            </div>

            {series.description && (
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
                {series.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {firstChapter && (
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-8 shadow-lg shadow-primary/20"
                >
                  <Link
                    href={`/series/${series.slug}/chapter-${firstChapter.chapterNumber}`}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Start Reading
                  </Link>
                </Button>
              )}

              <Button
                variant={isFavorited ? "secondary" : "outline"}
                size="lg"
                className="h-11"
                onClick={handleToggleFavorite}
              >
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    isFavorited && "fill-current text-red-500"
                  )}
                />
                {isFavorited ? "Favorited" : "Add to Favorites"}
              </Button>

              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="md:px-8 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Chapters
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {chapters?.length || 0}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAscending(!isAscending)}
            className="text-muted-foreground"
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            {isAscending ? "Oldest First" : "Newest First"}
          </Button>
        </div>

        {sortedChapters && sortedChapters.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedChapters.map((chapter) => (
              <Link
                key={chapter._id}
                href={`/series/${series.slug}/chapter-${chapter.chapterNumber}`}
                className="block group"
              >
                <Card className="hover:bg-accent/50 transition-all duration-200 border-border/50 hover:border-border hover:shadow-sm">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-primary transition-colors">
                        Chapter {chapter.chapterNumber}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {chapter.title || `Chapter ${chapter.chapterNumber}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono shrink-0">
                      {formatRelativeTime(chapter._creationTime)}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No chapters released yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
