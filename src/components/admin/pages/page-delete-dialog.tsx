import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { api } from "@convex/_generated/api";
import { DataModel } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PageDeleteDialogProps = {
  page: DataModel["pages"]["document"] | null;
  setPage: (page: DataModel["pages"]["document"] | null) => void;
};

export const PageDeleteDialog = ({ page, setPage }: PageDeleteDialogProps) => {
  const router = useRouter();
  const deletePage = useMutation(api.chapters.deletePage);

  const handleDeletePage = async () => {
    if (!page) return;

    try {
      await deletePage({ id: page._id });
      toast.success("Page deleted successfully");
      setPage(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error: " + (error as Error).message);
    }
  };

  return (
    <AlertDialog open={!!page} onOpenChange={() => setPage(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Page?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete Page {page?.pageNumber}. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePage}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
