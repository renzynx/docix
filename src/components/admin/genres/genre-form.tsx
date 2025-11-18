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
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const genreSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type GenreFormProps = {
  mode: "create" | "edit";
  genreId?: Id<"genres">;
  initialData?: {
    name: string;
    description?: string;
  };
};

export const GenreForm = ({ mode, genreId, initialData }: GenreFormProps) => {
  const router = useRouter();
  const createGenre = useMutation(api.genres.createGenre);
  const updateGenre = useMutation(api.genres.updateGenre);

  const form = useForm({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
    validators: {
      // @ts-expect-error idc
      onSubmit: genreSchema,
      // @ts-expect-error idc
      onBlur: genreSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === "create") {
          await createGenre({
            name: value.name,
            description: value.description || undefined,
          });
          toast.success("Genre created successfully!");
        } else {
          if (!genreId) throw new Error("Genre ID is required for update");
          await updateGenre({
            id: genreId,
            name: value.name,
            description: value.description || undefined,
          });
          toast.success("Genre updated successfully!");
        }
        router.push("/admin/genres");
      } catch (error) {
        toast.error("Error: " + (error as Error).message);
      }
    },
  });

  return (
    <Card className="max-w-2xl w-full">
      <CardHeader>
        <CardTitle className="text-2xl">
          {mode === "create" ? "Create New Genre" : "Edit Genre"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          id="genre-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="space-y-4">
              <form.Field name="name">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Genre Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        placeholder="e.g., Action, Romance, Fantasy"
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
                        Description (Optional)
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        rows={4}
                        placeholder="Describe this genre..."
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
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/genres")}
        >
          Cancel
        </Button>
        <Button type="submit" form="genre-form">
          {mode === "create" ? "Create Genre" : "Update Genre"}
        </Button>
      </CardFooter>
    </Card>
  );
};
