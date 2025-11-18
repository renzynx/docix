/* eslint-disable @next/next/no-img-element */
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { Doc } from "@convex/_generated/dataModel";

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
  if (!series) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Series not found
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
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Cover Image */}
        <div>
          <div className="aspect-[2/3] bg-muted overflow-hidden rounded-lg shadow-lg sticky top-24 max-w-[300px] mx-auto md:mx-0">
            {series.coverImageUrl ? (
              <img
                src={series.coverImageUrl}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground">No cover</span>
              </div>
            )}
          </div>
        </div>

        {/* Series Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{series.title}</h1>
                {series.author && (
                  <p className="text-lg text-muted-foreground">
                    by {series.author}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(series.status)}>
                {series.status}
              </Badge>
            </div>

            {series.genreNames && series.genreNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {series.genreNames.map((genre, idx) => (
                  <Badge key={`${genre}-${idx}`} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {series.description && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {series.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {chapters && chapters.length > 0 && (
              <Button asChild size="lg">
                <Link
                  href={`/series/${series.slug}/${chapters[0].chapterNumber}`}
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Start Reading
                </Link>
              </Button>
            )}
            <Button variant="outline" size="lg">
              <Heart className="mr-2 h-5 w-5" />
              Add to Favorites
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{chapters?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Chapters</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold capitalize">
                {series.status}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Favorites</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Chapters</h2>
        {chapters && chapters.length > 0 ? (
          <div className="grid gap-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter._id}
                href={`/series/${series.slug}/${chapter.chapterNumber}`}
              >
                <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        Chapter {chapter.chapterNumber}
                        {chapter.title && `: ${chapter.title}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {chapter.pageCount || 0} pages
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Read
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No chapters available yet
          </div>
        )}
      </div>
    </div>
  );
};
