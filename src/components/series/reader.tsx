/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";

type PageData = {
  _id: string;
  pageNumber: number;
  imageUrl: string | null;
};

type ReaderProps = {
  seriesSlug: string;
  seriesTitle: string;
  chapterNumber: number;
  chapterTitle?: string;
  pages: PageData[];
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
};

export const Reader = ({
  seriesSlug,
  seriesTitle,
  chapterNumber,
  chapterTitle,
  pages,
  hasNextChapter = false,
  hasPrevChapter = false,
}: ReaderProps) => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/series/${seriesSlug}`}>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">{seriesTitle}</h1>
                <p className="text-sm text-gray-400">
                  Chapter {chapterNumber}
                  {chapterTitle && `: ${chapterTitle}`}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {pages.length} page{pages.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Long Vertical Reader */}
      <div className="max-w-[1000px] mx-auto py-8">
        {pages.map((page) => (
          <div key={page._id} className="mb-2">
            {page.imageUrl ? (
              <img
                src={page.imageUrl}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-auto"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gray-900 flex items-center justify-center text-gray-500">
                Page {page.pageNumber} - Image not found
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 bg-black/90 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <Link href={`/series/${seriesSlug}/${chapterNumber - 1}`}>
              <Button
                variant="outline"
                disabled={!hasPrevChapter}
                className="border-white/20"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Chapter
              </Button>
            </Link>

            <Link href={`/series/${seriesSlug}/${chapterNumber + 1}`}>
              <Button
                variant="outline"
                disabled={!hasNextChapter}
                className="border-white/20"
              >
                Next Chapter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
