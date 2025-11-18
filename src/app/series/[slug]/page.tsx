import { Navbar } from "@/components/navbar";
import { SeriesDetail } from "@/components/series/series-detail";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

type SeriesPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;

  const [genres, seriesWithChapters] = await Promise.all([
    fetchQuery(api.genres.getAllGenres),
    fetchQuery(api.series.getWithChapters, { slug }),
  ]);

  if (!seriesWithChapters) {
    notFound();
  }

  return (
    <>
      <Navbar genres={genres} />
      <main className="container mx-auto px-4 py-8">
        <SeriesDetail data={seriesWithChapters} />
      </main>
    </>
  );
}
