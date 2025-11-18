import { Navbar } from "@/components/navbar";
import { SeriesGrid } from "@/components/series/series-grid";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

type GenrePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const [genres, series] = await Promise.all([
    fetchQuery(api.genres.getAllGenres),
    fetchQuery(api.series.getSeriesByGenre, { genreSlug: slug }),
  ]);

  if (!genres) {
    return notFound();
  }

  const genre = genres.find((g) => g.slug === slug);

  if (!genre) {
    return notFound();
  }

  return (
    <>
      <Navbar genres={genres} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{genre.name}</h1>
          {genre.description && (
            <p className="text-muted-foreground">{genre.description}</p>
          )}
        </div>
        <SeriesGrid series={series} />
      </main>
    </>
  );
}
