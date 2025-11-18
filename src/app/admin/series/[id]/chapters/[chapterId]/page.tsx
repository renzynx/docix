import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageList } from "@/components/admin/pages/page-list";
import { notFound } from "next/navigation";

export default async function PageListPage({
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
    <PageList chapter={chapter} seriesId={seriesId} chapterId={chapterId} />
  );
}
