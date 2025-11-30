"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, FileText, Search, Loader2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useState, useMemo } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Chapter =
  (typeof api.chapters.getAllChaptersAcrossSeries)["_returnType"]["page"][0];

export const AllChaptersTable = ({
  chapters,
  loadMore,
  status,
}: {
  chapters: Chapter[];
  loadMore: (numItems: number) => void;
  status: "CanLoadMore" | "LoadingMore" | "Exhausted" | "LoadingFirstPage";
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");

  // Get unique series for filter
  const uniqueSeries = useMemo(() => {
    if (!chapters) return [];
    const seriesMap = new Map<string, string>();
    chapters.forEach((chapter) => {
      if (!seriesMap.has(chapter.seriesSlug)) {
        seriesMap.set(chapter.seriesSlug, chapter.seriesTitle);
      }
    });
    return Array.from(seriesMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [chapters]);

  // Filter chapters (client-side filtering on loaded data)
  const filteredChapters = useMemo(() => {
    if (!chapters) return [];

    let filtered = chapters;

    // Filter by series
    if (seriesFilter !== "all") {
      filtered = filtered.filter(
        (chapter) => chapter.seriesSlug === seriesFilter
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chapter) =>
          chapter.title?.toLowerCase().includes(query) ||
          chapter.seriesTitle.toLowerCase().includes(query) ||
          `chapter ${chapter.chapterNumber}`.includes(query)
      );
    }

    return filtered;
  }, [chapters, searchQuery, seriesFilter]);

  if (!chapters || chapters.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No chapters found. Create your first chapter!
      </div>
    );
  }

  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by chapter title, number, or series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filter by series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {uniqueSeries.map(([slug, title]) => (
              <SelectItem key={slug} value={slug}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredChapters.length === chapters.length ? (
          <span>
            Showing {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
            {canLoadMore && " (more available)"}
          </span>
        ) : (
          <span>
            Showing {filteredChapters.length} of {chapters.length} loaded
            chapters
          </span>
        )}
      </div>

      {filteredChapters.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No chapters found matching your filters.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series</TableHead>
                <TableHead className="w-[120px]">Chapter #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChapters.map((chapter) => (
                <TableRow key={chapter._id}>
                  <TableCell>
                    <Link
                      href={`/admin/series/${chapter.seriesId}/chapters`}
                      className="font-medium hover:underline"
                    >
                      {chapter.seriesTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      Chapter {chapter.chapterNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    {chapter.title ? (
                      <span>{chapter.title}</span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Untitled
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{chapter.pageCount} pages</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(chapter._creationTime)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/admin/series/${chapter.seriesId}/chapters/${chapter._id}`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>View chapter</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Load More Button */}
      {canLoadMore && !searchQuery && seriesFilter === "all" && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadMore(50)}
            disabled={isLoadingMore}
            className="min-w-[200px]"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Chapters"
            )}
          </Button>
        </div>
      )}

      {status === "Exhausted" && chapters.length > 20 && (
        <div className="text-sm text-center text-muted-foreground py-4">
          All chapters loaded ({chapters.length} total)
        </div>
      )}
    </div>
  );
};
