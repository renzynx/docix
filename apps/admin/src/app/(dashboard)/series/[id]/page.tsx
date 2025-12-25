"use client";

import {
	adminCreateChapterMutationOptions,
	adminDeleteChapterMutationOptions,
	adminDeleteSeriesMutationOptions,
	adminGetSeriesQueryOptions,
	adminListChaptersQueryOptions,
	adminUpdateChapterMutationOptions,
	queryKeys,
} from "@docix/api";
import type { Chapter, CreateChapterRequest } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { Spinner } from "@docix/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	type ChapterFormData,
	ChapterFormDialog,
	ChapterTable,
	DeleteConfirmDialog,
	SeriesHeader,
} from "../_components";

export default function SeriesDetailPage() {
	const params = useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const seriesId = params.id as string;

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
	const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
	const [deleteChapterConfirm, setDeleteChapterConfirm] =
		useState<Chapter | null>(null);

	const { data: series, isLoading: isSeriesLoading } = useQuery(
		adminGetSeriesQueryOptions(seriesId),
	);
	const { data: chapters = [], isLoading: isChaptersLoading } = useQuery(
		adminListChaptersQueryOptions(seriesId),
	);

	const deleteSeriesMutation = useMutation({
		...adminDeleteSeriesMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSeries() });
			toast.success("Series deleted successfully");
			router.push("/series");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete series");
		},
	});

	const createChapterMutation = useMutation({
		...adminCreateChapterMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapters(seriesId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminSeriesDetail(seriesId),
			});
			setIsAddChapterOpen(false);
			toast.success("Chapter added successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to add chapter");
		},
	});

	const updateChapterMutation = useMutation({
		...adminUpdateChapterMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapters(seriesId),
			});
			setEditingChapter(null);
			toast.success("Chapter updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update chapter");
		},
	});

	const deleteChapterMutation = useMutation({
		...adminDeleteChapterMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapters(seriesId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminSeriesDetail(seriesId),
			});
			setDeleteChapterConfirm(null);
			toast.success("Chapter deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete chapter");
		},
	});

	const handleAddChapter = (data: ChapterFormData) => {
		createChapterMutation.mutate({
			id: seriesId,
			...data,
		} as { id: string } & CreateChapterRequest);
	};

	const handleUpdateChapter = (data: ChapterFormData) => {
		if (!editingChapter) return;
		updateChapterMutation.mutate({ id: editingChapter.id, ...data });
	};

	// Calculate next chapter number
	const nextChapterNumber =
		chapters.length > 0
			? Math.floor(Math.max(...chapters.map((c) => c.number))) + 1
			: 1;

	if (isSeriesLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!series) {
		return (
			<div className="space-y-4">
				<div className="rounded-lg border p-8 text-center">
					<h2 className="text-xl font-semibold">Series not found</h2>
					<p className="text-muted-foreground mt-2">
						The series you're looking for doesn't exist or has been deleted.
					</p>
					<Button className="mt-4" onClick={() => router.push("/series")}>
						Back to Series
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<SeriesHeader series={series} onDelete={() => setIsDeleteOpen(true)} />

			{/* Description */}
			{series.description && (
				<Card>
					<CardHeader>
						<CardTitle>Description</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground whitespace-pre-wrap">
							{series.description}
						</p>
					</CardContent>
				</Card>
			)}

			<ChapterTable
				seriesId={seriesId}
				chapters={chapters}
				isLoading={isChaptersLoading}
				isAddDialogOpen={isAddChapterOpen}
				onAddDialogOpenChange={setIsAddChapterOpen}
				onEditChapter={setEditingChapter}
				onDeleteChapter={setDeleteChapterConfirm}
			/>

			{/* Delete Series Confirmation */}
			<DeleteConfirmDialog
				open={isDeleteOpen}
				onOpenChange={setIsDeleteOpen}
				title="Delete Series"
				description={`Are you sure you want to delete "${series.title}"? This action cannot be undone and will delete all ${series.chapter_count} chapters and their pages.`}
				onConfirm={() => deleteSeriesMutation.mutate(seriesId)}
				isPending={deleteSeriesMutation.isPending}
			/>

			{/* Add Chapter Dialog */}
			<ChapterFormDialog
				open={isAddChapterOpen}
				onOpenChange={setIsAddChapterOpen}
				onSubmit={handleAddChapter}
				isPending={createChapterMutation.isPending}
				nextChapterNumber={nextChapterNumber}
			/>

			{/* Edit Chapter Dialog */}
			<ChapterFormDialog
				open={!!editingChapter}
				onOpenChange={(open: boolean) => !open && setEditingChapter(null)}
				chapter={editingChapter}
				onSubmit={handleUpdateChapter}
				isPending={updateChapterMutation.isPending}
				nextChapterNumber={nextChapterNumber}
			/>

			{/* Delete Chapter Confirmation */}
			<DeleteConfirmDialog
				open={!!deleteChapterConfirm}
				onOpenChange={() => setDeleteChapterConfirm(null)}
				title="Delete Chapter"
				description={`Are you sure you want to delete Chapter ${deleteChapterConfirm?.number}${deleteChapterConfirm?.title ? ` - ${deleteChapterConfirm.title}` : ""}? This action cannot be undone and will delete all pages in this chapter.`}
				onConfirm={() =>
					deleteChapterConfirm &&
					deleteChapterMutation.mutate(deleteChapterConfirm.id)
				}
				isPending={deleteChapterMutation.isPending}
			/>
		</div>
	);
}
