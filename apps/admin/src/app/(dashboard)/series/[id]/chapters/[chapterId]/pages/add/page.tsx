"use client";

import type { CreatePagesRequest } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import { Spinner } from "@docix/ui/components/spinner";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminAddPagesMutationOptions,
	adminGetChapterQueryOptions,
	adminGetSeriesQueryOptions,
	queryKeys,
} from "@docix/api";
import { uploadImages } from "@docix/api";
import { BulkImageUpload, type PendingPage } from "./_components";

export default function AddPagesPage() {
	const params = useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const seriesId = params.id as string;
	const chapterId = params.chapterId as string;

	const [pendingPages, setPendingPages] = useState<PendingPage[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<string>("");

	const { data: series } = useQuery(adminGetSeriesQueryOptions(seriesId));
	const { data: chapter, isLoading } = useQuery(
		adminGetChapterQueryOptions(chapterId),
	);

	const addPagesMutation = useMutation({
		...adminAddPagesMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminChapterDetail(chapterId),
			});
			toast.success(
				`${pendingPages.length} page${pendingPages.length !== 1 ? "s" : ""} added successfully`,
			);
			router.push(`/series/${seriesId}/chapters/${chapterId}`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to add pages");
		},
	});

	const existingPages = chapter?.pages ?? [];
	const startingNumber =
		existingPages.length > 0
			? Math.max(...existingPages.map((p) => p.number)) + 1
			: 1;

	const handleSubmit = async () => {
		if (pendingPages.length === 0) {
			toast.error("Please select at least one image");
			return;
		}

		setIsUploading(true);
		setUploadProgress("Converting images to WebP...");

		try {
			// Upload all images in bulk
			const files = pendingPages.map((p) => p.file);
			setUploadProgress(`Uploading ${files.length} images...`);

			const { filenames, failed } = await uploadImages(files);

			if (failed.length > 0) {
				toast.warning(`${failed.length} image(s) failed to upload`);
			}

			if (filenames.length === 0) {
				toast.error("No images were uploaded successfully");
				return;
			}

			setUploadProgress("Creating pages...");

			// Create pages with the uploaded filenames
			// Use the starting number + index since we upload in order
			const pages = filenames.map((filename, index) => ({
				number: startingNumber + index,
				image_url: filename,
			}));

			addPagesMutation.mutate({
				id: chapterId,
				pages,
			} as { id: string } & CreatePagesRequest);
		} catch (error) {
			console.error("Upload failed:", error);
			toast.error("Failed to upload images. Please try again.");
		} finally {
			setIsUploading(false);
			setUploadProgress("");
		}
	};

	const isSubmitting = isUploading || addPagesMutation.isPending;

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
					<Link
						href={`/series/${seriesId}/chapters/${chapterId}`}
						className="hover:underline"
					>
						Chapter {chapter.number}
					</Link>
					<span>/</span>
					<span>Add Pages</span>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Add Pages</h1>
						<p className="text-muted-foreground">
							Add new pages to Chapter {chapter.number}
							{chapter.title && ` - ${chapter.title}`}. Pages will be numbered
							starting from {startingNumber}.
						</p>
					</div>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link href={`/series/${seriesId}/chapters/${chapterId}`} />}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
						Back to Chapter
					</Button>
				</div>
			</div>

			{/* Bulk Upload */}
			<div className="rounded-lg border p-6 space-y-6">
				<div>
					<h2 className="text-lg font-semibold">Upload Images</h2>
					<p className="text-sm text-muted-foreground">
						Select multiple images to add as pages. They will be sorted
						alphabetically by filename and numbered sequentially.
					</p>
				</div>

				<BulkImageUpload
					pendingPages={pendingPages}
					onPagesChange={setPendingPages}
					startingNumber={startingNumber}
				/>

				{/* Actions */}
				<div className="flex items-center justify-between pt-4 border-t">
					<p className="text-sm text-muted-foreground">
						{pendingPages.length > 0
							? `${pendingPages.length} page${pendingPages.length !== 1 ? "s" : ""} ready to upload`
							: "No pages selected"}
					</p>
					<div className="flex items-center gap-3">
						{uploadProgress && (
							<span className="text-sm text-muted-foreground">
								{uploadProgress}
							</span>
						)}
						<Button
							variant="outline"
							nativeButton={false}
							render={
								<Link href={`/series/${seriesId}/chapters/${chapterId}`} />
							}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={pendingPages.length === 0 || isSubmitting}
						>
							{isSubmitting && <Spinner className="mr-2" />}
							{isUploading
								? "Uploading..."
								: `Add ${pendingPages.length} Page${pendingPages.length !== 1 ? "s" : ""}`}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
