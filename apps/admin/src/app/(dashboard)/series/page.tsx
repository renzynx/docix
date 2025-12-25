"use client";

import type { Series } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@docix/ui/components/table";
import {
	Add01Icon,
	Delete02Icon,
	PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminDeleteSeriesMutationOptions,
	adminListSeriesQueryOptions,
	queryKeys,
} from "@/lib/api.generated";
import { DeleteConfirmDialog, getStatusColor } from "./_components";

export default function SeriesPage() {
	const queryClient = useQueryClient();
	const [deleteConfirm, setDeleteConfirm] = useState<Series | null>(null);

	const { data: seriesData, isLoading } = useQuery(
		adminListSeriesQueryOptions(),
	);

	const deleteMutation = useMutation({
		...adminDeleteSeriesMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSeries() });
			setDeleteConfirm(null);
			toast.success("Series deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete series");
		},
	});

	const series = seriesData?.data ?? [];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Series</h1>
					<p className="text-muted-foreground">
						Manage manga, manhwa, and webtoon series.
					</p>
				</div>
				<Button nativeButton={false} render={<Link href="/series/new" />}>
					<HugeiconsIcon icon={Add01Icon} className="size-4" />
					Add Series
				</Button>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Spinner className="size-8" />
				</div>
			) : series.length > 0 ? (
				<>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[80px]">Cover</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Chapters</TableHead>
									<TableHead>Views</TableHead>
									<TableHead className="w-[120px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{series.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											{item.cover_image_url || item.cover_image ? (
												<img
													src={item.cover_image_url || item.cover_image}
													alt={item.title}
													className="h-12 w-9 rounded object-cover"
												/>
											) : (
												<div className="h-12 w-9 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
													N/A
												</div>
											)}
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												<Link
													href={`/series/${item.id}`}
													className="font-medium hover:underline"
												>
													{item.title}
												</Link>
												{item.author && (
													<span className="text-sm text-muted-foreground">
														by {item.author}
													</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell>{item.chapter_count}</TableCell>
										<TableCell>{item.view_count.toLocaleString()}</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													nativeButton={false}
													render={<Link href={`/series/${item.id}/edit`} />}
													title="Edit series"
												>
													<HugeiconsIcon
														icon={PencilEdit01Icon}
														className="size-4"
													/>
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:text-destructive"
													onClick={() => setDeleteConfirm(item)}
													title="Delete series"
												>
													<HugeiconsIcon
														icon={Delete02Icon}
														className="size-4"
													/>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{seriesData && seriesData.total_pages > 1 && (
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Showing {series.length} of {seriesData.total} series
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={seriesData.page <= 1}
								>
									Previous
								</Button>
								<span className="text-sm">
									Page {seriesData.page} of {seriesData.total_pages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={seriesData.page >= seriesData.total_pages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</>
			) : (
				<div className="rounded-lg border p-8 text-center text-muted-foreground">
					<p>No series found. Create your first series to get started.</p>
					<Button
						className="mt-4"
						nativeButton={false}
						render={<Link href="/series/new" />}
					>
						<HugeiconsIcon icon={Add01Icon} className="size-4" />
						Add Series
					</Button>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={!!deleteConfirm}
				onOpenChange={() => setDeleteConfirm(null)}
				title="Delete Series"
				description={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone and will delete all associated chapters and pages.`}
				onConfirm={() =>
					deleteConfirm && deleteMutation.mutate(deleteConfirm.id)
				}
				isPending={deleteMutation.isPending}
			/>
		</div>
	);
}
