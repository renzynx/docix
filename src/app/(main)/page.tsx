import { SeriesGrid } from "@/components/series/series-grid";
import { LatestSeriesCarousel } from "@/components/series/latest-series-carousel";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Home() {
  const [latestSeries, series] = await Promise.all([
    fetchQuery(api.series.getLatestSeries, {
      limit: 10,
    }),
    fetchQuery(api.series.getAllSeries, {
      paginationOpts: {
        numItems: 20,
        cursor: null,
      },
    }),
  ]);

  return (
    <main className="min-h-screen">
      <section className="bg-gradient-to-b from-background via-background to-muted/20 py-8 md:py-12 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 md:mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Latest Updates
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Catch up with the newest chapters and discover trending series
            </p>
          </div>
          <LatestSeriesCarousel series={latestSeries} />
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">All Series</h2>
            <p className="text-muted-foreground">
              Browse our complete collection of manga and comics
            </p>
          </div>
          <SeriesGrid series={series.page} />

          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link href="/series">Browse More Series</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
