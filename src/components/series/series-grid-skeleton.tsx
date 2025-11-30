import { Skeleton } from "@/components/ui/skeleton";

interface SeriesGridSkeletonProps {
  count?: number;
}

export function SeriesGridSkeleton({ count = 20 }: SeriesGridSkeletonProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Image skeleton */}
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
