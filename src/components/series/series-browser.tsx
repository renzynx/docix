"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { SeriesGrid } from "./series-grid";
import { SeriesGridSkeleton } from "./series-grid-skeleton";
import { SeriesPagination } from "./series-pagination";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE_OPTIONS = [20, 40, 60, 100];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", variant: "secondary" },
  { value: "ongoing", label: "Ongoing", variant: "success" },
  { value: "completed", label: "Completed", variant: "info" },
  { value: "hiatus", label: "Hiatus", variant: "warning" },
  { value: "cancelled", label: "Cancelled", variant: "destructive" },
] as const;

function SeriesBrowserContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL State
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const statusFilter = searchParams.get("status") || "all";
  const genreFilter = searchParams.get("genre") || "all"; // Single genre slug
  const sortOption = searchParams.get("sort") || "newest";
  const searchQueryParam = searchParams.get("q") || "";

  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(searchParams.get("perPage") || "20", 10)
  );

  // Local State
  const [searchTerm, setSearchTerm] = useState(searchQueryParam);
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [openGenreCombobox, setOpenGenreCombobox] = useState(false); // State for Combobox Popover

  // Sync Debounced Search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearch && debouncedSearch !== searchQueryParam) {
      params.set("q", debouncedSearch);
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    } else if (!debouncedSearch && searchQueryParam) {
      params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, pathname, router, searchParams, searchQueryParam]);

  // --- DATA FETCHING ---

  const genresData = useQuery(api.genres.getAllGenres);

  const isSearching = !!debouncedSearch;
  const isGenreFiltering = genreFilter !== "all";

  const searchResults = useQuery(
    api.series.searchSeries,
    isSearching
      ? {
          searchText: debouncedSearch,
          statusFilter: statusFilter === "all" ? undefined : statusFilter,
        }
      : "skip"
  );

  // Query B: Single Genre Filter (If no search)
  const genreResults = useQuery(
    api.series.getSeriesByGenre,
    isGenreFiltering && !isSearching
      ? {
          genreSlug: genreFilter,
        }
      : "skip"
  );

  // Query C: Standard Paginated List (Default)
  const paginatedResults = useQuery(
    api.series.getAllSeries,
    !isSearching && !isGenreFiltering
      ? {
          paginationOpts: {
            numItems: itemsPerPage,
            cursor: null,
          },
          statusFilter: statusFilter === "all" ? undefined : statusFilter,
          sortOrder: sortOption === "oldest" ? "asc" : "desc",
        }
      : "skip"
  );

  // --- NORMALIZATION ---

  const { visibleSeries, totalItems, totalPages } = useMemo(() => {
    let rawData = [];
    let effectiveTotal = 0;

    // PATH 1: SEARCHING
    if (isSearching) {
      rawData = searchResults || [];
      effectiveTotal = rawData.length;

      // Client-side filtering by genre slug on search results
      if (isGenreFiltering) {
        const requiredName = genresData?.find(
          (g) => g.slug === genreFilter
        )?.name;
        rawData = rawData.filter((s) =>
          s.genreNames?.includes(requiredName || "")
        );
        effectiveTotal = rawData.length;
      }
      // Client-side status filter applied in search query (backend)
    }
    // PATH 2: GENRE FILTERING (No Search)
    else if (isGenreFiltering) {
      rawData = genreResults || [];

      // Client-side status filter (if needed, as getSeriesByGenre doesn't filter status)
      if (statusFilter !== "all") {
        rawData = rawData.filter((s) => s.status === statusFilter);
      }
      effectiveTotal = rawData.length;
    }
    // PATH 3: STANDARD BROWSING
    else {
      rawData = paginatedResults?.page || [];
      effectiveTotal = paginatedResults?.totalCount || 0;
    }

    // --- PAGINATION ---

    // For Search and Genre results, we do client-side slicing
    let displayData = rawData;
    if (isSearching || isGenreFiltering) {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      displayData = rawData.slice(start, end);
    }

    return {
      visibleSeries: displayData,
      totalItems: effectiveTotal,
      totalPages: Math.ceil(effectiveTotal / itemsPerPage) || 1,
    };
  }, [
    isSearching,
    isGenreFiltering,
    searchResults,
    genreResults,
    paginatedResults,
    genresData,
    genreFilter,
    statusFilter,
    currentPage,
    itemsPerPage,
  ]);

  const isLoading =
    (isSearching && searchResults === undefined) ||
    (isGenreFiltering && !isSearching && genreResults === undefined) ||
    (!isSearching && !isGenreFiltering && paginatedResults === undefined);

  // --- HANDLERS ---

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "" || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    updateParam("status", status);
  };

  const handleGenreSelect = (slug: string) => {
    updateParam("genre", slug);
    setOpenGenreCombobox(false);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    updateParam("genre", "all"); // Clear genre filter
    router.push(pathname);
  };

  if (isLoading) {
    return <SeriesGridSkeleton />;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ongoing: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      completed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      hiatus: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      all: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    };
    return colors[status] || colors.all;
  };

  const currentGenreLabel =
    genreFilter === "all"
      ? "Select Genre"
      : genresData?.find((g) => g.slug === genreFilter)?.name || "Select Genre";

  return (
    <div className="container max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* --- FILTERS BAR --- */}
      <div className="flex flex-col gap-4">
        {/* Top Row: Search & Counts */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="outline"
              className="h-9 px-3 py-1 flex items-center gap-1"
            >
              <Filter className="h-3 w-3" />
              {totalItems} Results
            </Badge>
          </div>
        </div>

        {/* Bottom Row: Dropdowns & Status */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
          {/* Filter Group */}
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Genre Combobox (Single Select) */}
            <Popover
              open={openGenreCombobox}
              onOpenChange={setOpenGenreCombobox}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openGenreCombobox}
                  className="w-[160px] h-10 justify-between"
                >
                  {currentGenreLabel}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[160px] p-0">
                <Command>
                  <CommandInput placeholder="Search genre..." />
                  <CommandList>
                    <CommandEmpty>No genre found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => handleGenreSelect("all")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            genreFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Genres
                      </CommandItem>
                      {genresData?.map((g) => (
                        <CommandItem
                          key={g._id}
                          value={g.name}
                          onSelect={() => handleGenreSelect(g.slug)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              genreFilter === g.slug
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {g.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="h-8 w-px bg-border hidden lg:block" />

            {/* Sort Select */}
            <Select
              value={sortOption}
              onValueChange={(val) => updateParam("sort", val)}
            >
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-8 w-px bg-border hidden lg:block" />

            {/* Status Pills */}
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status.value}
                  variant={
                    statusFilter === status.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleStatusChange(status.value)}
                  className={
                    statusFilter === status.value
                      ? getStatusColor(status.value)
                      : "border-muted"
                  }
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Pagination Controls Group */}
          <div className="flex items-center gap-2 mt-4 lg:mt-0">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Show:
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value, 10));
                updateParam("perPage", value);
              }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      {visibleSeries.length > 0 ? (
        <SeriesGrid series={visibleSeries} />
      ) : (
        <div className="py-20 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No series found matching your filters.
          </p>
          <Button variant="link" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalPages > 1 && (
        <SeriesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}

export function SeriesBrowser() {
  return (
    <Suspense fallback={<SeriesGridSkeleton />}>
      <SeriesBrowserContent />
    </Suspense>
  );
}
