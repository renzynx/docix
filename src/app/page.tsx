import { Navbar } from "@/components/navbar";
import { SeriesGrid } from "@/components/series/series-grid";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export default async function Home() {
  const [genres, series] = await Promise.all([
    fetchQuery(api.genres.getAllGenres),
    fetchQuery(api.series.getAllSeries, {
      paginationOpts: {
        numItems: 20,
        cursor: null,
      },
    }),
  ]);

  return (
    <>
      <Navbar genres={genres} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Latest Series</h1>
          <p className="text-muted-foreground">
            Discover the latest manga and comics
          </p>
        </div>
        <SeriesGrid series={series} />
      </main>
    </>
  );
}
