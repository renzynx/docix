"use client";

import type { Chapter } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@docix/ui/components/dialog";
import { useEffect } from "react";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";

export interface ChapterFormData {
	number: number;
	title: string;
}

const chapterSchema = z.object({
	number: z.number().min(0, "Chapter number must be positive"),
	title: z.string(),
});

interface ChapterFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	chapter?: Chapter | null;
	onSubmit: (data: ChapterFormData) => void;
	isPending: boolean;
	nextChapterNumber: number;
}

export function ChapterFormDialog({
	open,
	onOpenChange,
	chapter,
	onSubmit,
	isPending,
	nextChapterNumber,
}: ChapterFormDialogProps) {
	const isEdit = !!chapter;

	const form = useAppForm({
		defaultValues: chapter
			? { number: chapter.number, title: chapter.title || "" }
			: { number: nextChapterNumber, title: "" },
		validators: {
			onSubmit: chapterSchema,
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			if (chapter) {
				form.reset({ number: chapter.number, title: chapter.title || "" });
			} else {
				form.reset({ number: nextChapterNumber, title: "" });
			}
		}
	}, [open, chapter, nextChapterNumber, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>{isEdit ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
						<DialogDescription>
							{isEdit
								? "Update the chapter details."
								: "Add a new chapter to this series."}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<form.AppField name="number">
							{(field) => (
								<field.NumberField
									required
									label="Chapter Number"
									step={0.1}
									placeholder="1"
								/>
							)}
						</form.AppField>
						<form.AppField name="title">
							{(field) => (
								<field.TextField
									label="Title (optional)"
									placeholder="The Beginning"
								/>
							)}
						</form.AppField>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubscribeButton
								label={isEdit ? "Save Changes" : "Add Chapter"}
								disabled={isPending}
							/>
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
