import { ChapterListWrapper } from "@/components/admin/chapters/chapter-list-wrapper";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ id: Id<"series"> }>;
}) {
  const { id } = await params;
  const series = await fetchQuery(api.series.getWithChaptersById, { id });

  if (!series) {
    return notFound();
  }

  return <ChapterListWrapper series={series} />;
}
