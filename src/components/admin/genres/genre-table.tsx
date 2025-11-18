"use client";

import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Edit, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { GenreDeleteDialog } from "./genre-delete-dialog";
import { Input } from "@/components/ui/input";

type GenreTableProps = {
  genres: (typeof api.genres.getAllGenres)["_returnType"];
};

export const GenreTable = ({ genres }: GenreTableProps) => {
  const router = useRouter();
  const deleteGenre = useMutation(api.genres.deleteGenre);
  const [deletingId, setDeletingId] = useState<Id<"genres"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGenres = useMemo(() => {
    if (!searchQuery) return genres;

    const query = searchQuery.toLowerCase();
    return genres.filter(
      (genre) =>
        genre.name.toLowerCase().includes(query) ||
        genre.slug.toLowerCase().includes(query) ||
        genre.description?.toLowerCase().includes(query)
    );
  }, [genres, searchQuery]);

  const handleDelete = async (id: Id<"genres">) => {
    setDeletingId(id);
    try {
      await deleteGenre({ id });
      toast.success("Genre deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Error: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <TooltipProvider>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGenres.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? "No genres found matching your search"
                      : "No genres found. Create one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGenres.map((genre) => (
                  <TableRow key={genre._id}>
                    <TableCell className="font-medium">{genre.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {genre.slug}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {genre.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                router.push(`/admin/genres/${genre._id}/edit`)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit genre</TooltipContent>
                        </Tooltip>

                        <GenreDeleteDialog
                          deletingId={deletingId}
                          genre={genre}
                          handleDelete={handleDelete}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </div>
  );
};
