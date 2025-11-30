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
import {
  Eye,
  FileText,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { Preloaded, usePreloadedQuery } from "convex/react";

const ITEMS_PER_PAGE = 20;

export const AllChaptersTable = ({
  preloadedChapters,
}: {
  preloadedChapters: Preloaded<typeof api.chapters.getAllChaptersAcrossSeries>;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { page: chapters, totalCount } = usePreloadedQuery(preloadedChapters);

  // Get unique series for filter
  const uniqueSeries = useMemo(() => {
    if (!chapters) return [];
    const seriesMap = new Map<string, string>();
    // Note: This relies on all chapters being loaded for filter generation
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

    // Reset page to 1 if filters change and current page is invalid
    if (
      currentPage > 1 &&
      filtered.length <= (currentPage - 1) * ITEMS_PER_PAGE
    ) {
      setCurrentPage(1);
    }

    return filtered;
  }, [chapters, searchQuery, seriesFilter, currentPage]);

  const totalFilteredItems = filteredChapters.length;
  const totalPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);

  // Apply Pagination Slicing
  const paginatedChapters = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredChapters.slice(start, end);
  }, [filteredChapters, currentPage]);

  // Helper function to generate visible page numbers
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (!chapters || chapters.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No chapters found. Create your first chapter!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by chapter title, number, or series..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset page on search change
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={seriesFilter}
          onValueChange={(slug) => {
            setSeriesFilter(slug);
            setCurrentPage(1); // Reset page on filter change
          }}
        >
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
        Showing {paginatedChapters.length} of {totalFilteredItems} result
        {totalFilteredItems !== 1 ? "s" : ""}
        {totalFilteredItems > 0 && ` (Page ${currentPage} of ${totalPages})`}
        {totalCount && searchQuery === "" && seriesFilter === "all" && (
          <span className="ml-2">· Total chapters: {totalCount}</span>
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
              {paginatedChapters.map((chapter) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}

          {totalPages > getPageNumbers()[getPageNumbers().length - 1] && (
            <Button variant="ghost" size="sm" disabled>
              ...
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
