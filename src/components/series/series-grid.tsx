/* eslint-disable @next/next/no-img-element */
"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { Badge } from "../ui/badge";

type SeriesGridProps = {
  series:
    | (typeof api.series.getAllSeries)["_returnType"]
    | (typeof api.series.getSeriesByGenre)["_returnType"];
};

export const SeriesGrid = ({ series }: SeriesGridProps) => {
  if (!series || series.length === 0) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {series.map((item) => (
        <Link key={item._id} href={`/series/${item.slug}`}>
          <div className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
            <div className="relative aspect-[2/3] bg-muted overflow-hidden rounded-lg">
              {item.coverImageUrl ? (
                <img
                  src={item.coverImageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">
                    No cover
                  </span>
                </div>
              )}

              {/* Gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Status badge at top */}
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>

              {/* Title and info at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1">
                  {item.title}
                </h3>

                {item.genreNames && item.genreNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.genreNames.slice(0, 2).map((genre, idx) => (
                      <Badge
                        key={`${genre}-${idx}`}
                        variant="secondary"
                        className="text-xs px-2 py-0 bg-white/20 text-white hover:bg-white/30 border-0"
                      >
                        {genre}
                      </Badge>
                    ))}
                    {item.genreNames.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0 bg-white/20 text-white hover:bg-white/30 border-0"
                      >
                        +{item.genreNames.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Chapter badges - placeholder for now */}
                <div className="flex gap-2">
                  <Badge className="bg-black/60 text-white hover:bg-black/80 border-0 text-xs">
                    Chapter 1
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
