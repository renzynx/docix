"use client";

import { AllChaptersTable } from "@/components/admin/chapters/all-chapters-table";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";

function AllChaptersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[250px]" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export default function AdminChaptersPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chapters.getAllChaptersAcrossSeries,
    {},
    { initialNumItems: 50 }
  );

  const isLoadingFirstPage = status === "LoadingFirstPage";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Chapters</h1>
        <p className="text-muted-foreground">
          Manage all chapters across all series in one place
        </p>
      </div>

      {isLoadingFirstPage ? (
        <AllChaptersTableSkeleton />
      ) : (
        <AllChaptersTable
          chapters={results}
          loadMore={loadMore}
          status={status}
        />
      )}
    </div>
  );
}
