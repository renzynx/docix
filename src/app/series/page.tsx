import { Navbar } from "@/components/navbar";
import { SeriesBrowser } from "@/components/series/series-browser";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export default async function BrowsePage() {
  const genres = await fetchQuery(api.genres.getAllGenres);

  return (
    <>
      <Navbar genres={genres} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse All Series</h1>
          <p className="text-muted-foreground">
            Explore our complete collection of manga and comics
          </p>
        </div>
        <SeriesBrowser />
      </main>
    </>
  );
}
