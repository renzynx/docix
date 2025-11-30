/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

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
  chapters?: { number: number; title?: string; _id: string }[];
};

export const Reader = ({
  seriesSlug,
  seriesTitle,
  chapterNumber,
  chapterTitle,
  pages,
  hasNextChapter = false,
  hasPrevChapter = false,
  chapters = [],
}: ReaderProps) => {
  const [showControls, setShowControls] = useState(true);
  const router = useRouter();

  const toggleControls = () => setShowControls((prev) => !prev);

  const handleChapterChange = (value: string) => {
    router.push(`/series/${seriesSlug}/chapter-${value}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Top Navigation Bar - Slides in/out */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
          showControls
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
          <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Link href={`/series/${seriesSlug}`}>
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to Series</span>
                </Link>
              </Button>
              <div className="flex flex-col min-w-0">
                <h1 className="font-semibold text-sm sm:text-base truncate">
                  {seriesTitle}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Chapter {chapterNumber}
                  {chapterTitle && (
                    <span className="opacity-75"> - {chapterTitle}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="text-xs font-mono text-muted-foreground shrink-0">
              {pages.length} PAGES
            </div>
          </div>
        </div>
      </header>

      {/* Main Reader Content */}
      <main
        className="w-full min-h-screen flex flex-col items-center bg-background cursor-pointer"
        onClick={toggleControls}
      >
        <div className="w-full max-w-3xl mx-auto py-20 flex flex-col">
          {pages.map((page) => (
            <div key={page._id} className="relative w-full">
              {page.imageUrl ? (
                <img
                  src={page.imageUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-auto block select-none"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-muted flex flex-col items-center justify-center text-muted-foreground rounded border border-border p-4 text-center my-4">
                  <span className="text-lg font-mono mb-2">
                    Page {page.pageNumber}
                  </span>
                  <span className="text-sm opacity-60">
                    Image failed to load
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation Bar - Slides in/out */}
      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
          showControls
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border px-4 py-4 pb-8 sm:pb-4">
          <div className="container mx-auto max-w-xl grid grid-cols-3 items-center gap-4">
            <Button
              asChild
              variant="outline"
              className={cn(
                "justify-self-start w-full sm:w-auto",
                !hasPrevChapter && "opacity-50 pointer-events-none"
              )}
            >
              <Link
                href={
                  hasPrevChapter
                    ? `/series/${seriesSlug}/chapter-${chapterNumber - 1}`
                    : "#"
                }
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Link>
            </Button>

            <div className="justify-self-center w-full max-w-[180px]">
              <Select
                value={chapterNumber.toString()}
                onValueChange={handleChapterChange}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={`Ch. ${chapterNumber}`} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {chapters.map((chapter) => (
                    <SelectItem
                      key={chapter._id}
                      value={chapter.number.toString()}
                    >
                      Chapter {chapter.number}
                      {chapter.title ? ` - ${chapter.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              asChild
              variant="outline"
              className={cn(
                "justify-self-end w-full sm:w-auto",
                !hasNextChapter && "opacity-50 pointer-events-none"
              )}
            >
              <Link
                href={
                  hasNextChapter
                    ? `/series/${seriesSlug}/chapter-${chapterNumber + 1}`
                    : "#"
                }
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};
