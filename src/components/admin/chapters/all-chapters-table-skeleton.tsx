import { Skeleton } from "@/components/ui/skeleton";

export function AllChaptersTableSkeleton() {
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
