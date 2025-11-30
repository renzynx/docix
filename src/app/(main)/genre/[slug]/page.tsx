import { SeriesGrid } from "@/components/series/series-grid";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

type GenrePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const series = await fetchQuery(api.series.getSeriesByGenre, {
    genreSlug: slug,
  });

  if (!series) {
    return notFound();
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <SeriesGrid series={series} />
      </main>
    </>
  );
}
