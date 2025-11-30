import { SeriesDetail } from "@/components/series/series-detail";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { cache } from "react";

type SeriesPageProps = {
  params: Promise<{ slug: string }>;
};

const fetchSeriesData = cache(async (slug: string) => {
  return await fetchQuery(api.series.getWithChapters, { slug });
});

export async function generateMetadata({ params }: SeriesPageProps) {
  const { slug } = await params;

  const seriesData = await fetchSeriesData(slug);

  if (!seriesData) {
    return {
      title: "Series Not Found",
      description: "The requested series does not exist.",
    };
  }

  return {
    title: seriesData.title,
    description: seriesData.description,
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const seriesData = await fetchSeriesData(slug);

  if (!seriesData) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <SeriesDetail data={seriesData} />
    </main>
  );
}
