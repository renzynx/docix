"use client";

import { useForm } from "@tanstack/react-form";
import z from "zod";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../ui/field";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Progress } from "../../ui/progress";
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
import { SortableFileItem } from "./sortable-file-item";

const chapterSchema = z.object({
  chapterNumber: z.number().min(1, "Chapter number must be at least 1"),
  title: z.string().optional(),
});

type ChapterEditFormProps = {
  chapterId: Id<"chapters">;
  seriesId: Id<"series">;
  seriesTitle?: string;
  initialData: {
    chapterNumber: number;
    title?: string;
    pages: Array<{
      _id: Id<"pages">;
      pageNumber: number;
      storageId: Id<"_storage">;
      url: string | null;
    }>;
  };
};

export const ChapterEditForm = ({
  chapterId,
  seriesId,
  seriesTitle,
  initialData,
}: ChapterEditFormProps) => {
  const router = useRouter();
  const updateChapter = useMutation(api.chapters.updateChapter);
  const addPage = useMutation(api.chapters.addPage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrls);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm({
    defaultValues: {
      chapterNumber: initialData.chapterNumber,
      title: initialData.title || "",
    },
    validators: {
      // @ts-expect-error idc
      onSubmit: chapterSchema,
      // @ts-expect-error idc
      onBlur: chapterSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        setUploading(true);
        setUploadProgress(0);

        // Update chapter metadata
        await updateChapter({
          id: chapterId,
          chapterNumber: value.chapterNumber,
          title: value.title || undefined,
        });

        // If there are new files to upload
        if (selectedFiles.length > 0) {
          // Generate upload URLs for new pages
          const uploadUrls = await generateUploadUrl({
            count: selectedFiles.length,
          });

          // Upload all new pages with progress tracking
          let completedUploads = 0;
          const uploadPromises = selectedFiles.map(async (file, index) => {
            const response = await fetch(uploadUrls[index], {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!response.ok) {
              throw new Error(`Failed to upload page ${index + 1}`);
            }

            const { storageId } = await response.json();

            // Add page to chapter (it will get the next page number)
            await addPage({
              chapterId,
              pageNumber: initialData.pages.length + index + 1,
              storageId,
            });

            // Update progress
            completedUploads++;
            setUploadProgress(
              Math.round((completedUploads / selectedFiles.length) * 100)
            );
          });

          await Promise.all(uploadPromises);
        }

        toast.success("Chapter updated successfully!");
        router.push(`/admin/series/${seriesId}/chapters/${chapterId}`);
      } catch (error) {
        console.error(error);
        toast.error("Error: " + (error as Error).message);
      } finally {
        setUploading(false);
      }
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedFiles((items) => {
        const oldIndex = items.findIndex(
          (_, i) => `${items[i].name}-${i}` === active.id
        );
        const newIndex = items.findIndex(
          (_, i) => `${items[i].name}-${i}` === over.id
        );

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <Card className="max-w-4xl w-full">
      <CardHeader>
        <CardTitle className="text-2xl">
          Edit Chapter {initialData.chapterNumber}
          {seriesTitle && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              from {seriesTitle}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          id="chapter-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="space-y-6">
            {/* Chapter Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Chapter Information
              </h3>
              <FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Field name="chapterNumber">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Chapter Number{" "}
                            <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            type="number"
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(Number(e.target.value))
                            }
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            min={1}
                            step={1}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="title">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Chapter Title (Optional)
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            placeholder="e.g., The Beginning"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                </div>
              </FieldGroup>
            </div>

            {/* Existing Pages */}
            {initialData.pages.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Existing Pages ({initialData.pages.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  To manage existing pages, go back to the view page.
                </p>
              </div>
            )}

            {/* Add New Pages Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Add New Pages (Optional)
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("page-upload")?.click()
                    }
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Images
                  </Button>
                  <input
                    id="page-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles.length} new page(s) selected
                  </span>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Uploading pages...
                      </span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-3">
                      New Pages (drag to reorder):
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedFiles.map(
                          (file, i) => `${file.name}-${i}`
                        )}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {selectedFiles.map((file, index) => (
                            <SortableFileItem
                              key={`${file.name}-${index}`}
                              id={`${file.name}-${index}`}
                              file={file}
                              index={initialData.pages.length + index}
                              onRemove={() => removeFile(index)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button type="submit" form="chapter-edit-form" disabled={uploading}>
          {uploading ? "Updating..." : "Update Chapter"}
        </Button>
      </CardFooter>
    </Card>
  );
};
