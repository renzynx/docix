import { api } from "@convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchQuery } from "convex/nextjs";
import { SeriesList } from "@/components/admin/series/series-list";

export default async function SeriesPage() {
  const series = await fetchQuery(api.series.getAllSeries, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Series</CardTitle>
              <CardDescription>
                View and manage all manga/comic series
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/admin/series/new">
                <Plus className="h-4 w-4 mr-2" />
                Create New Series
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SeriesList series={series} />
        </CardContent>
      </Card>
    </div>
  );
}
