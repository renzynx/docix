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

  if (!chapters || chapters.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No chapters found. Create your first chapter!
      </div>
    );
  }

  return (
    <>
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
          {chapters.map((chapter) => (
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
    </>
  );
};
