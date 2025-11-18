"use client";

import { api } from "@convex/_generated/api";
import { DataModel, Id } from "@convex/_generated/dataModel";
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { ChapterDeleteDialog } from "../chapters/chapter-delete-dialog";
import { PageDeleteDialog } from "./page-delete-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePageItem } from "./sortable-page-item";
import { useMutation } from "convex/react";

type PageListProps = {
  chapter: NonNullable<(typeof api.chapters.getChapterById)["_returnType"]>;
  seriesId: Id<"series">;
  chapterId: Id<"chapters">;
};

export const PageList = ({ chapter, seriesId, chapterId }: PageListProps) => {
  const router = useRouter();
  const [chapterDelete, setChapterDelete] = useState<
    PageListProps["chapter"] | null
  >(null);
  const [pageDelete, setPageDelete] = useState<
    DataModel["pages"]["document"] | null
  >(null);
  const [pages, setPages] = useState(chapter.pages);
  const reorderPages = useMutation(api.chapters.reorderPages);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p._id === active.id);
      const newIndex = pages.findIndex((p) => p._id === over.id);

      const newPages = arrayMove(pages, oldIndex, newIndex);
      setPages(newPages);

      // Update in database
      try {
        await reorderPages({
          chapterId,
          pageIds: newPages.map((p) => p._id),
        });
      } catch (error) {
        console.error("Failed to reorder pages:", error);
        // Revert on error
        setPages(pages);
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                Chapter {chapter.chapterNumber}
                {chapter.title && `: ${chapter.title}`}
              </CardTitle>
              <CardDescription className="mt-2">
                {pages.length} page(s)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        router.push(
                          `/admin/series/${seriesId}/chapters/${chapterId}/edit`
                        )
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Chapter</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setChapterDelete(chapter)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete Chapter</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pages.map((p) => p._id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {pages.map((page) => (
                    <SortablePageItem
                      key={page._id}
                      page={page}
                      onDelete={() => setPageDelete(page)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No pages in this chapter yet.
            </p>
          )}
        </CardContent>
      </Card>

      <PageDeleteDialog page={pageDelete} setPage={setPageDelete} />
      <ChapterDeleteDialog
        chapter={chapterDelete}
        seriesId={seriesId}
        setChapter={(chapter) =>
          setChapterDelete(chapter as typeof chapterDelete)
        }
      />
    </>
  );
};
