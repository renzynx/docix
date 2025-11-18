/* eslint-disable @next/next/no-img-element */
"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Id } from "@convex/_generated/dataModel";
import { SeriesDeleteDialog } from "./series-delete-dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

export const SeriesList = ({
  series,
}: {
  series: (typeof api.series.getAllSeries)["_returnType"];
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"series"> | null>(null);
  const deleteSeries = useMutation(api.series.deleteSeries);

  // Filter series based on search query
  const filteredSeries = useMemo(() => {
    if (!series) return [];
    if (!searchQuery.trim()) return series;

    const query = searchQuery.toLowerCase();
    return series.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.genreNames?.some((genre) => genre.toLowerCase().includes(query))
    );
  }, [series, searchQuery]);

  const handleDelete = async (id: Id<"series">) => {
    try {
      setDeletingId(id);
      await deleteSeries({ id });
      toast.success("Series deleted successfully!");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete series: " + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (statusValue: string) => {
    const colors = {
      ongoing:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      completed:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      hiatus:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[statusValue as keyof typeof colors] || colors.ongoing;
  };

  if (!series || series.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No series found. Create your first series!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search series by title, author, description, or genre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {filteredSeries.length === 0 && searchQuery ? (
        <div className="py-12 text-center text-muted-foreground">
          No series found matching &quot;{searchQuery}&quot;
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSeries.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {item.coverImageUrl ? (
                    <div className="relative h-16 w-12 bg-muted rounded overflow-hidden">
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="object-cover h-16 w-12 rounded"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-12 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        No cover
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.slug}
                  </div>
                </TableCell>
                <TableCell>
                  {item.author ? (
                    <span>{item.author}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.description ? (
                    <div className="max-w-xs truncate text-muted-foreground">
                      {item.description}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.genreNames && item.genreNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.genreNames.slice(0, 2).map((genre, idx) => (
                        <span
                          key={`${genre}-${idx}`}
                          className="px-2 py-1 text-xs rounded-full bg-secondary"
                        >
                          {genre}
                        </span>
                      ))}
                      {item.genreNames.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.genreNames.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item._creationTime)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/admin/series/${item._id}/chapters`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>View chapters</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/admin/series/${item._id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Edit series</TooltipContent>
                    </Tooltip>

                    <SeriesDeleteDialog
                      deletingId={deletingId}
                      item={item}
                      handleDelete={handleDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
