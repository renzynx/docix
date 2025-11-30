/* eslint-disable @next/next/no-img-element */
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "../../ui/multi-select";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { fileToBase64, uploadCover } from "@/lib/utils";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Loader2 } from "lucide-react"; // Import Loader2 for submission state
import { CommandGroup } from "cmdk";

const mangaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  author: z.string().optional(),
  status: z
    .enum(["ongoing", "completed", "hiatus", "cancelled"])
    .default("ongoing"),
  genres: z.array(z.string()).optional(), // Expects array of genre IDs (strings)
  coverImage: z.string().optional(), // base64 representation of the new image
});

const statuses = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" },
];

type SeriesFormProps = {
  mode?: "create" | "edit";
  initialValues?: {
    title?: string;
    description?: string;
    author?: string;
    status?: "ongoing" | "completed" | "hiatus" | "cancelled";
    genres?: string[]; // Array of genre IDs
    coverImageUrl?: string;
  };
  seriesId?: string;
};

export const SeriesForm = ({
  mode = "create",
  initialValues,
  seriesId,
}: SeriesFormProps) => {
  const router = useRouter();
  const createManga = useMutation(api.series.createSeries);
  const updateManga = useMutation(api.series.updateSeries);
  const generateUploadUrl = useMutation(api.files.generateUploadUrls);
  const genres = useQuery(api.genres.getAllGenres) || [];

  // State to hold the temporary local URL for preview
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(
    initialValues?.coverImageUrl || null
  );

  // Transform genres data for MultiSelect component
  const genreOptions = React.useMemo(
    () =>
      genres.map((genre) => ({
        label: genre.name,
        value: genre._id, // Use Convex ID as the value
      })),
    [genres]
  );

  const form = useForm({
    defaultValues: {
      title: initialValues?.title || "",
      description: initialValues?.description || "",
      author: initialValues?.author || "",
      status: initialValues?.status || "ongoing",
      genres: initialValues?.genres || [], // Array of genre IDs
      coverImage: "", // Holds Base64 or an empty string
    },
    validators: {
      // @ts-expect-error idc
      onSubmit: mangaSchema,
      // @ts-expect-error idc
      onBlur: mangaSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        let storageId = null;

        // Only upload if a new cover image is selected (value.coverImage holds the Base64 string)
        if (value.coverImage) {
          const [uploadUrl] = await generateUploadUrl({ count: 1 });
          storageId = await uploadCover(value.coverImage, uploadUrl);
        }

        if (mode === "edit" && seriesId) {
          await updateManga({
            id: seriesId as Id<"series">,
            title: value.title,
            description: value.description,
            author: value.author,
            status: value.status as z.infer<typeof mangaSchema>["status"],
            genres: (value.genres || []) as Id<"genres">[], // genres array contains Id<"genres">
            // Pass storageId only if a new file was uploaded, otherwise leave undefined to preserve current
            coverImageStorageId: storageId !== null ? storageId : undefined,
          });

          toast.success("Series updated successfully!");
        } else {
          const newSeriesId = await createManga({
            title: value.title,
            description: value.description,
            author: value.author,
            status: value.status as z.infer<typeof mangaSchema>["status"],
            genres: (value.genres || []) as Id<"genres">[], // genres array contains Id<"genres">
            coverImageStorageId: storageId || undefined,
          });

          toast.success("Manga series created successfully!");
          router.push(`/admin/series/edit/${newSeriesId}`); // Redirect to edit page
          return;
        }

        router.push("/admin/series");
      } catch (error) {
        console.log(error);
        toast.error("Error: " + (error as Error).message);
      }
    },
  });

  // Function to handle file input change
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    handleChange: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      handleChange(base64); // Update form state with base64
      setPreviewImageUrl(base64); // Update local state for preview
    } else {
      handleChange("");
      setPreviewImageUrl(initialValues?.coverImageUrl || null);
    }
  };

  return (
    <Card className="max-w-4xl w-full">
      <CardHeader>
        <CardTitle className="text-2xl">
          {mode === "edit" ? "Edit Manga Series" : "Add New Manga Series"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          id="manga-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Cover Image */}
            <div className="md:col-span-1">
              <form.Field name="coverImage">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Cover Image</FieldLabel>

                    {/* Image Preview Area */}
                    <div className="mb-3 w-full aspect-[2/3] max-w-[200px] mx-auto">
                      {previewImageUrl ? (
                        <img
                          src={previewImageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover rounded-lg border-2 shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">
                            No cover
                          </span>
                        </div>
                      )}
                    </div>

                    <Input
                      type="file"
                      accept="image/*"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => handleFileChange(e, field.handleChange)}
                    />
                    {mode === "edit" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Leave empty to keep current cover
                      </p>
                    )}
                  </Field>
                )}
              </form.Field>
            </div>

            {/* Right Column - Form Fields */}
            <div className="md:col-span-2 space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Basic Information
                </h3>
                <FieldGroup>
                  <form.Field name="title">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Title <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            placeholder="Enter series title"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="description">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Description
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter a description for the series..."
                            autoComplete="off"
                            rows={4}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </div>

              <Separator />

              {/* Additional Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Additional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Field name="status">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Status</FieldLabel>

                          <Select
                            name={field.name}
                            value={field.state.value}
                            onValueChange={(value) =>
                              field.handleChange(
                                value as typeof field.state.value
                              )
                            }
                          >
                            <SelectTrigger
                              id="manga-status"
                              aria-invalid={isInvalid}
                            >
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent position="item-aligned">
                              {statuses.map((status) => (
                                <SelectItem
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="author">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Author</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            placeholder="Enter author name"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                </div>

                <form.Field name="genres">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field data-invalid={isInvalid} className="mt-4">
                        <FieldLabel htmlFor={field.name}>Genres</FieldLabel>

                        <MultiSelect
                          values={field.state.value}
                          onValuesChange={(values) =>
                            field.handleChange(values as string[])
                          }
                        >
                          <MultiSelectTrigger className="w-full">
                            <MultiSelectValue placeholder="Select genres" />
                          </MultiSelectTrigger>
                          <MultiSelectContent>
                            <CommandGroup>
                              {genreOptions.map((option) => (
                                <MultiSelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </MultiSelectItem>
                              ))}
                            </CommandGroup>
                          </MultiSelectContent>
                        </MultiSelect>

                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button
          type="submit"
          form="manga-form"
          disabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {mode === "edit" ? "Update Series" : "Create Series"}
        </Button>
      </CardFooter>
    </Card>
  );
};
