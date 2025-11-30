import { SeriesBrowser } from "@/components/series/series-browser";

export default async function BrowsePage() {
  return (
    <>
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
