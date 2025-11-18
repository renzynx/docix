"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ChapterDeleteDialog } from "./chapter-delete-dialog";
import { ChaptersList } from "./chapters-list";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { Id } from "@convex/_generated/dataModel";
import Link from "next/link";

type ChapterListWrapperProps = {
  series: NonNullable<typeof api.series.getWithChaptersById._returnType>;
};

export const ChapterListWrapper = ({ series }: ChapterListWrapperProps) => {
  const [deletingId, setDeletingId] = useState<Id<"chapters"> | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chapters</CardTitle>
              <CardDescription>
                Manage chapters for {series?.title || "this series"}
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`/admin/series/${series?._id}/chapters/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Chapter
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChaptersList
            chapters={series.chapters}
            seriesId={series._id}
            setDeletingId={setDeletingId}
          />
        </CardContent>
      </Card>

      <ChapterDeleteDialog
        chapter={
          series.chapters.find((chapter) => chapter._id === deletingId) ?? null
        }
        seriesId={series._id}
        setChapter={() => setDeletingId(null)}
      />
    </>
  );
};
