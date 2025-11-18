import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@convex/_generated/dataModel";
import { GenreForm } from "@/components/admin/genres/genre-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditGenrePage({ params }: PageProps) {
  const { id } = await params;
  const genreId = id as Id<"genres">;
  const genre = await fetchQuery(api.genres.getGenreById, {
    id: genreId,
  });

  if (!genre) {
    return notFound();
  }

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/genres">Genres</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{genre.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-center">
        <GenreForm
          mode="edit"
          genreId={genreId}
          initialData={{
            name: genre.name,
            description: genre.description,
          }}
        />
      </div>
    </div>
  );
}
