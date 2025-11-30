"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { SeriesGrid } from "./series-grid";
import { SeriesGridSkeleton } from "./series-grid-skeleton";
import { SeriesPagination } from "./series-pagination";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE_OPTIONS = [20, 40, 60, 100];
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
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const statusFilter = searchParams.get("status") || "all";
  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(searchParams.get("perPage") || "20", 10)
  );

  // Fetch total series count using our sharded counter
  const totalSeriesCount = useQuery(api.series.getTotalSeriesCount);

  // Fetch series with filters
  const series = useQuery(api.series.getAllSeries, {
    paginationOpts: {
      numItems: itemsPerPage,
      cursor: null,
    },
    statusFilter: statusFilter === "all" ? undefined : statusFilter,
  });

  // Calculate total pages
  const totalPages = totalSeriesCount
    ? Math.ceil(totalSeriesCount / itemsPerPage)
    : 0;

  // Handle filter change
  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1"); // Reset to page 1 when changing filters
    router.push(`?${params.toString()}`);
  };

  // Handle items per page change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPerPage = params.get("perPage");

    if (currentPerPage !== itemsPerPage.toString()) {
      params.set("perPage", itemsPerPage.toString());
      params.set("page", "1"); // Reset to page 1 when changing items per page
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [itemsPerPage, searchParams]);

  if (totalSeriesCount === undefined || !series) {
    return <SeriesGridSkeleton />;
  }

  const getStatusColor = (status: string) => {
    const colors = {
      ongoing: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      completed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      hiatus: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      all: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    );
  };

  return (
    <div className="space-y-6">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status.value}
            variant={statusFilter === status.value ? "default" : "outline"}
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

      {/* Stats and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {totalSeriesCount}{" "}
              <span className="text-muted-foreground font-normal">
                {totalSeriesCount === 1 ? "Series" : "Series"}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
          </div>
          {statusFilter !== "all" && (
            <Badge className={getStatusColor(statusFilter)} variant="secondary">
              {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Show:
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => setItemsPerPage(parseInt(value, 10))}
          >
            <SelectTrigger className="w-[100px]">
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
          <span className="text-sm text-muted-foreground hidden sm:inline">
            per page
          </span>
        </div>
      </div>

      {/* Series grid */}
      <SeriesGrid series={series} />

      {/* Pagination */}
      <SeriesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalSeriesCount}
        itemsPerPage={itemsPerPage}
      />
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
