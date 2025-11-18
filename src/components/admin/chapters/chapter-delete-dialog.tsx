import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ChapterWithPages = NonNullable<
  typeof api.chapters.getChapterById._returnType
>;
type ChapterWithPageCount =
  (typeof api.chapters.getAllChapters._returnType)[number];

type ChaptersDeleteDialogProps = {
  seriesId: Id<"series">;
  chapter: ChapterWithPages | ChapterWithPageCount | null;
  setChapter: (chapter: ChapterWithPages | ChapterWithPageCount | null) => void;
};

export const ChapterDeleteDialog = ({
  chapter,
  seriesId,
  setChapter,
}: ChaptersDeleteDialogProps) => {
  const router = useRouter();
  const deleteChapter = useMutation(api.chapters.deleteChapter);

  const handleDeleteChapter = async () => {
    try {
      if (!chapter) return;

      await deleteChapter({ id: chapter._id });
      toast.success("Chapter deleted successfully");
      router.push(`/admin/series/${seriesId}/chapters`);
    } catch (error) {
      console.error(error);
      toast.error("Error: " + (error as Error).message);
    }
  };

  const pageCount = chapter
    ? "pageCount" in chapter
      ? chapter.pageCount
      : chapter.pages.length
    : 0;

  return (
    <AlertDialog open={!!chapter} onOpenChange={() => setChapter(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete Chapter {chapter?.chapterNumber}
            {chapter?.title && ` (${chapter.title})`} and all {pageCount} of its
            pages. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteChapter}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
