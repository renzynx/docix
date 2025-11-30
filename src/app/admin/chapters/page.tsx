import { AllChaptersTable } from "@/components/admin/chapters/all-chapters-table";
import { AllChaptersTableSkeleton } from "@/components/admin/chapters/all-chapters-table-skeleton";
import { ConvexAuthLoading } from "@/components/convex-auth-loading";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Chapters Management",
  description: "Manage all manga/comic chapters in the admin panel.",
};

export default async function AdminChaptersPage() {
  const token =
    (await (await auth()).getToken({ template: "convex" })) ?? undefined;
  const preloadedChapters = await preloadQuery(
    api.chapters.getAllChaptersAcrossSeries,
    { limit: 50 },
    { token }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Chapters</h1>
        <p className="text-muted-foreground">
          Manage all chapters across all series in one place
        </p>
      </div>

      <ConvexAuthLoading fallback={<AllChaptersTableSkeleton />}>
        <AllChaptersTable preloadedChapters={preloadedChapters} />
      </ConvexAuthLoading>
    </div>
  );
}
