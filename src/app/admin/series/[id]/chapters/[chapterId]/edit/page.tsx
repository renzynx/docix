import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ChapterEditForm } from "@/components/admin/chapters/chapter-edit-form";
import { notFound } from "next/navigation";

export default async function ChapterEditPage({
  params,
}: {
  params: Promise<{ id: Id<"series">; chapterId: Id<"chapters"> }>;
}) {
  const { id: seriesId, chapterId } = await params;

  const [series, chapter] = await Promise.all([
    fetchQuery(api.series.getSeriesById, { id: seriesId }),
    fetchQuery(api.chapters.getChapterById, {
      id: chapterId,
    }),
  ]);

  if (!series || !chapter) {
    return notFound();
  }

  return (
    <div className="flex items-center justify-center">
      <ChapterEditForm
        chapterId={chapterId}
        seriesId={seriesId}
        seriesTitle={series.title}
        initialData={chapter}
      />
    </div>
  );
}
