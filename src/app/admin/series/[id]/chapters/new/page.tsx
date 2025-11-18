import { NewChapterForm } from "@/components/admin/chapters/new-chapter-form";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

export default async function NewChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seriesId = id as Id<"series">;

  const series = await fetchQuery(api.series.getSeriesById, {
    id: seriesId,
  });

  if (!series) {
    return notFound();
  }

  return (
    <div className="flex justify-center">
      <NewChapterForm seriesId={seriesId} seriesTitle={series.title} />
    </div>
  );
}
