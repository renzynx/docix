import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@convex/_generated/dataModel";
import { SeriesForm } from "@/components/admin/series/series-form";
import { notFound } from "next/navigation";

export default async function SeriesEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await fetchQuery(api.series.getSeriesById, {
    id: id as Id<"series">,
  });

  if (!series) {
    return notFound();
  }

  return (
    <div className="flex justify-center">
      <SeriesForm
        mode="edit"
        seriesId={series._id}
        initialValues={{
          title: series.title,
          description: series.description,
          author: series.author,
          status: series.status,
          genres: series.genres,
          coverImageUrl: series.coverImageUrl || undefined,
        }}
      />
    </div>
  );
}
