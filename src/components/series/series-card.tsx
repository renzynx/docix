/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export interface SeriesCardProps {
  series: {
    _id: string;
    slug: string;
    title: string;
    coverImageUrl?: string | null;
    status: string;
    genreNames?: string[];
    latestChapter?: {
      chapterNumber: number;
      _creationTime: number;
    } | null;
  };
}

export const SeriesCard = ({ series }: SeriesCardProps) => {
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
    <div className="group relative overflow-hidden rounded-lg transition-all hover:shadow-lg h-full border bg-card text-card-foreground">
      {/* Main Series Link - Covers the card but sits below interactive elements */}
      <Link
        href={`/series/${series.slug}`}
        className="absolute inset-0 z-10"
        prefetch={false}
      >
        <span className="sr-only">View {series.title}</span>
      </Link>

      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {series.coverImageUrl ? (
          <img
            src={series.coverImageUrl}
            alt={series.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/50">
            <span className="text-muted-foreground text-xs md:text-sm">
              No cover
            </span>
          </div>
        )}

        {/* Gradient overlay - stronger on mobile */}
        <div className="absolute inset-x-0 bottom-0 h-32 md:h-36 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

        {/* Status badge - hidden on mobile, shown on hover or md+ */}
        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
          <Badge
            className={`text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 ${getStatusColor(
              series.status
            )}`}
          >
            {series.status}
          </Badge>
        </div>

        {/* Content at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-2 md:p-3 text-white z-20 pointer-events-none flex flex-col justify-end">
          <h3 className="font-semibold text-xs md:text-sm line-clamp-2 leading-tight mb-1 md:mb-1.5">
            {series.title}
          </h3>

          {/* Genres - Show only 1 on mobile, 2 on larger screens */}
          {series.genreNames && series.genreNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5 md:mb-2">
              {series.genreNames.slice(0, 1).map((genre, idx) => (
                <Badge
                  key={`${genre}-${idx}`}
                  variant="secondary"
                  className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-4 md:h-5 md:hidden"
                >
                  {genre}
                </Badge>
              ))}
              {series.genreNames.slice(0, 2).map((genre, idx) => (
                <Badge
                  key={`${genre}-${idx}`}
                  variant="secondary"
                  className="hidden md:inline-flex text-[10px] px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-5"
                >
                  {genre}
                </Badge>
              ))}
              {series.genreNames.length > 1 && (
                <Badge
                  variant="secondary"
                  className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-4 md:h-5 md:hidden"
                >
                  +{series.genreNames.length - 1}
                </Badge>
              )}
              {series.genreNames.length > 2 && (
                <Badge
                  variant="secondary"
                  className="hidden md:inline-flex text-[10px] px-1.5 py-0 bg-white/20 text-white hover:bg-white/30 border-0 h-5"
                >
                  +{series.genreNames.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Latest Chapter Link - Simplified on mobile */}
          {series.latestChapter && (
            <div className="flex items-center mt-0.5 md:mt-1 pointer-events-auto">
              <Link
                href={`/series/${series.slug}/chapter-${series.latestChapter.chapterNumber}`}
                className="group/chapter inline-flex"
              >
                {/* Mobile version - compact */}
                <Badge className="md:hidden bg-primary/90 text-primary-foreground hover:bg-primary border-0 text-[9px] h-5 px-1.5 flex items-center gap-1 transition-colors">
                  <span className="font-semibold">
                    Ch. {series.latestChapter.chapterNumber}
                  </span>
                </Badge>
                {/* Desktop version - with timestamp */}
                <Badge className="hidden md:flex bg-primary/90 text-primary-foreground hover:bg-primary border-0 text-[10px] h-6 px-2 items-center gap-1.5 transition-colors">
                  <span className="font-semibold">
                    Ch. {series.latestChapter.chapterNumber}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/50" />
                  <span className="font-normal opacity-90">
                    {formatRelativeTime(series.latestChapter._creationTime)}
                  </span>
                </Badge>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
