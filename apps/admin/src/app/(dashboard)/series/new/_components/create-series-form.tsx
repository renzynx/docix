"use client";

import {
	adminCreateSeriesMutationOptions,
	adminListTagsQueryOptions,
	queryKeys,
} from "@docix/api";
import type { CreateSeriesRequest } from "@docix/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SeriesForm, type SeriesFormData } from "../../_components";

export function CreateSeriesForm() {
	const router = useRouter();
	const queryClient = useQueryClient();

	// Tags are prefetched on server, this just reads from cache
	const { data: tags = [] } = useQuery(adminListTagsQueryOptions());

	const createMutation = useMutation({
		...adminCreateSeriesMutationOptions(),
		onSuccess: (series) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSeries() });
			toast.success("Series created successfully");
			// Navigate to the new series detail page
			router.push(`/series/${series.id}`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create series");
		},
	});

	const handleSubmit = async (data: SeriesFormData) => {
		createMutation.mutate(data as CreateSeriesRequest);
	};

	return (
		<SeriesForm
			tags={tags}
			onSubmit={handleSubmit}
			isPending={createMutation.isPending}
			cancelHref="/series"
			submitLabel="Create Series"
		/>
	);
}
