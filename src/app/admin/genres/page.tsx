import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { GenreTable } from "@/components/admin/genres/genre-table";
import Link from "next/link";

export default async function GenresPage() {
  const genres = await fetchQuery(api.genres.getAllGenres);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Genres</CardTitle>
          <Button asChild>
            <Link href="/admin/genres/new">
              <Plus className="h-4 w-4 mr-2" />
              Add New Genre
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <GenreTable genres={genres} />
        </CardContent>
      </Card>
    </div>
  );
}
