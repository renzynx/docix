"use client";

import {
	adminDeletePageMutationOptions,
	adminGetChapterQueryOptions,
	adminGetSeriesQueryOptions,
	adminReorderPagesMutationOptions,
	queryKeys,
} from "@docix/api";
import type { Page } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@docix/ui/components/dialog";
import { Spinner } from "@docix/ui/components/spinner";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageGrid } from "./_components";

export default function ChapterPagesPage() {
	const params = useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const seriesId = params.id as string;
	const chapterId = params.chapterId as string;

	const [deletePageConfirm, setDeletePageConfirm] = useState<Page | null>(null);

	const { data: series } = useQuery(adminGetSeriesQueryOptions(seriesId));
	const { data: chapter, isLoading } = useQuery(
		adminGetChapterQueryOptions(chapterId),
	);

	const deletePageMutation = useMutation({
		...adminDeletePageMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapterDetail(chapterId),
			});
			setDeletePageConfirm(null);
			toast.success("Page deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete page");
		},
	});

	const reorderPagesMutation = useMutation({
		...adminReorderPagesMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapterDetail(chapterId),
			});
			toast.success("Pages reordered successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reorder pages");
		},
	});

	const pages = chapter?.pages ?? [];

	const handleReorder = (
		pageOrders: Array<{ page_id: string; number: number }>,
	) => {
		reorderPagesMutation.mutate({ id: chapterId, page_orders: pageOrders });
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!chapter) {
		return (
			<div className="space-y-4">
				<div className="rounded-lg border p-8 text-center">
					<h2 className="text-xl font-semibold">Chapter not found</h2>
					<p className="text-muted-foreground mt-2">
						The chapter you're looking for doesn't exist or has been deleted.
					</p>
					<Button
						className="mt-4"
						onClick={() => router.push(`/series/${seriesId}`)}
					>
						Back to Series
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Breadcrumb Header */}
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Link href="/series" className="hover:underline">
						Series
					</Link>
					<span>/</span>
					<Link href={`/series/${seriesId}`} className="hover:underline">
						{series?.title ?? "..."}
					</Link>
					<span>/</span>
					<span>Chapter {chapter.number}</span>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Chapter {chapter.number} {chapter.title && `- ${chapter.title}`}
						</h1>
						<p className="text-muted-foreground">
							Manage pages for this chapter. {pages.length} page
							{pages.length !== 1 ? "s" : ""}.
						</p>
					</div>
					<Button
						nativeButton={false}
						render={
							<Link
								href={`/series/${seriesId}/chapters/${chapterId}/pages/add`}
							/>
						}
					>
						<HugeiconsIcon icon={Add01Icon} className="size-4" />
						Add Pages
					</Button>
				</div>
			</div>

			{/* Pages Grid */}
			<PageGrid
				pages={pages}
				onReorder={handleReorder}
				onDelete={setDeletePageConfirm}
			/>

			{/* Delete Page Confirmation */}
			<Dialog
				open={!!deletePageConfirm}
				onOpenChange={() => setDeletePageConfirm(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Page</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete page {deletePageConfirm?.number}?
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeletePageConfirm(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								deletePageConfirm &&
								deletePageMutation.mutate(deletePageConfirm.id)
							}
							disabled={deletePageMutation.isPending}
						>
							{deletePageMutation.isPending && <Spinner className="mr-2" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
