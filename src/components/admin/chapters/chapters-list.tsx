"use client";

import { Button } from "@/components/ui/button";
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
import { formatRelativeTime } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Edit, Eye, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TablePagination } from "../table-pagination";
import { useState, useMemo } from "react";

export const ChaptersList = ({
  chapters,
  seriesId,
  setDeletingId,
}: {
  chapters: typeof api.chapters.getAllChapters._returnType;
  seriesId: Id<"series">;
  setDeletingId: (id: Id<"chapters"> | null) => void;
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Paginate chapters
  const paginatedChapters = useMemo(() => {
    if (!chapters) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return chapters.slice(startIndex, endIndex);
  }, [chapters, currentPage, itemsPerPage]);

  const totalPages = chapters ? Math.ceil(chapters.length / itemsPerPage) : 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (!chapters || chapters.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No chapters found. Create your first chapter!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Chapter #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedChapters.map((chapter) => (
              <TableRow key={chapter._id}>
                <TableCell>
                  <div className="font-medium">
                    Chapter {chapter.chapterNumber}
                  </div>
                </TableCell>
                <TableCell>
                  {chapter.title ? (
                    <span>{chapter.title}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Untitled</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{chapter.pageCount} pages</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(chapter._creationTime)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(
                              `/admin/series/${seriesId}/chapters/${chapter._id}`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View chapter</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(
                              `/admin/series/${seriesId}/chapters/${chapter._id}/edit`
                            )
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit chapter</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeletingId(chapter._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete chapter</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={chapters.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        itemLabel="chapters"
      />
    </div>
  );
};
