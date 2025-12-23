"use client";

import type { PaginatedResponse, Series } from "@docix/types";
import { Input } from "@docix/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@docix/ui/components/select";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { SeriesGrid, SeriesGridSkeleton } from "@/components/series-grid";
import { api, listTagsQueryOptions } from "@/lib/api.generated";

const SORT_OPTIONS = [
	{ value: "latest", label: "Latest" },
	{ value: "popular", label: "Popular" },
	{ value: "updated", label: "Recently Updated" },
	{ value: "alphabetical", label: "A-Z" },
] as const;

const STATUS_OPTIONS = [
	{ value: "", label: "All Status" },
	{ value: "ongoing", label: "Ongoing" },
	{ value: "completed", label: "Completed" },
	{ value: "hiatus", label: "Hiatus" },
	{ value: "cancelled", label: "Cancelled" },
] as const;

const ITEMS_PER_PAGE = 24;

export default function BrowsePage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Read filters from URL
	const search = searchParams.get("search") ?? "";
	const sort = searchParams.get("sort") ?? "latest";
	const status = searchParams.get("status") ?? "";
	const tag = searchParams.get("tag") ?? "";
	const page = Number(searchParams.get("page") ?? "1");

	// Local search input state (for debouncing)
	const [searchInput, setSearchInput] = useState(search);

	// Build query params
	const queryParams = useMemo(
		() => ({
			page,
			limit: ITEMS_PER_PAGE,
			sort,
			...(status && { status }),
			...(tag && { tag }),
			...(search && { search }),
		}),
		[page, sort, status, tag, search],
	);

	// Fetch series
	const {
		data: seriesData,
		isPending: isLoadingSeries,
		isError,
	} = useQuery({
		queryKey: ["manga", "browse", queryParams],
		queryFn: async () => {
			const { data } = await api.get<PaginatedResponse<Series>>("/manga", {
				params: queryParams,
			});
			return data;
		},
	});

	// Fetch tags for filter
	const { data: tagsData } = useQuery(listTagsQueryOptions());

	// Update URL with new params
	const updateFilters = useCallback(
		(updates: Record<string, string | undefined>) => {
			startTransition(() => {
				const params = new URLSearchParams(searchParams.toString());

				for (const [key, value] of Object.entries(updates)) {
					if (value === undefined || value === "") {
						params.delete(key);
					} else {
						params.set(key, value);
					}
				}

				// Reset page when filters change (except when changing page itself)
				if (!("page" in updates)) {
					params.delete("page");
				}

				router.push(`/browse?${params.toString()}`);
			});
		},
		[router, searchParams],
	);

	// Debounced search
	const handleSearchSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			updateFilters({ search: searchInput || undefined });
		},
		[searchInput, updateFilters],
	);

	const totalPages = seriesData?.total_pages ?? 1;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-bold">Browse Manga</h1>
				<p className="text-muted-foreground mt-1">
					Discover manga from our collection
				</p>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
				{/* Search */}
				<form
					onSubmit={handleSearchSubmit}
					className="relative flex-1 min-w-64"
				>
					<HugeiconsIcon
						icon={Search01Icon}
						size={18}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="search"
						placeholder="Search manga..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="pl-10"
					/>
				</form>

				{/* Sort */}
				<Select
					value={sort}
					onValueChange={(value) => updateFilters({ sort: value ?? "latest" })}
				>
					<SelectTrigger className="w-40">
						<SelectValue>
							{(value: string) =>
								SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Latest"
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status */}
				<Select
					value={status}
					onValueChange={(value) =>
						updateFilters({ status: value || undefined })
					}
				>
					<SelectTrigger className="w-36">
						<SelectValue>
							{(value: string) =>
								STATUS_OPTIONS.find((o) => o.value === value)?.label ??
								"All Status"
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((option) => (
							<SelectItem key={option.value || "all"} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Tag */}
				{tagsData && tagsData.length > 0 && (
					<Select
						value={tag}
						onValueChange={(value) =>
							updateFilters({ tag: value || undefined })
						}
					>
						<SelectTrigger className="w-36">
							<SelectValue>
								{(value: string) =>
									tagsData?.find((t) => t.slug === value)?.name ?? "All Tags"
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">All Tags</SelectItem>
							{tagsData.map((t) => (
								<SelectItem key={t.id} value={t.slug}>
									{t.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{/* Results */}
			{isLoadingSeries || isPending ? (
				<SeriesGridSkeleton count={ITEMS_PER_PAGE} />
			) : isError || !seriesData ? (
				<div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
					<p className="text-muted-foreground">Failed to load series</p>
				</div>
			) : (
				<>
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>
							Showing {seriesData.data.length} of {seriesData.total} results
						</span>
						<span>
							Page {page} of {totalPages}
						</span>
					</div>

					<SeriesGrid series={seriesData.data} />

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-center gap-2 pt-4">
							<button
								type="button"
								disabled={page <= 1}
								onClick={() => updateFilters({ page: String(page - 1) })}
								className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
							>
								Previous
							</button>

							{/* Page numbers */}
							<div className="flex gap-1">
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									// Show pages around current page
									let pageNum: number;
									if (totalPages <= 5) {
										pageNum = i + 1;
									} else if (page <= 3) {
										pageNum = i + 1;
									} else if (page >= totalPages - 2) {
										pageNum = totalPages - 4 + i;
									} else {
										pageNum = page - 2 + i;
									}

									return (
										<button
											key={pageNum}
											type="button"
											onClick={() => updateFilters({ page: String(pageNum) })}
											className={`w-10 h-10 text-sm rounded-lg border transition-colors ${
												pageNum === page
													? "bg-primary text-primary-foreground"
													: "hover:bg-muted"
											}`}
										>
											{pageNum}
										</button>
									);
								})}
							</div>

							<button
								type="button"
								disabled={page >= totalPages}
								onClick={() => updateFilters({ page: String(page + 1) })}
								className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
							>
								Next
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
