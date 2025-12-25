"use client";

import {
	adminGetSeriesQueryOptions,
	adminListTagsQueryOptions,
	adminUpdateSeriesMutationOptions,
	queryKeys,
} from "@docix/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	SeriesForm,
	type SeriesFormData,
	toFormValues,
} from "../../../_components";

interface EditSeriesFormProps {
	seriesId: string;
}

export function EditSeriesForm({ seriesId }: EditSeriesFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	// Series and tags are prefetched on server, this reads from cache
	const { data: series } = useQuery(adminGetSeriesQueryOptions(seriesId));
	const { data: tags = [] } = useQuery(adminListTagsQueryOptions());

	const updateMutation = useMutation({
		...adminUpdateSeriesMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.adminSeriesDetail(seriesId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.adminSeries() });
			toast.success("Series updated successfully");
			// Navigate back to series detail page
			router.push(`/series/${seriesId}`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update series");
		},
	});

	const handleSubmit = async (data: SeriesFormData) => {
		updateMutation.mutate({ id: seriesId, ...data });
	};

	if (!series) {
		return null;
	}

	// Convert series API response to form values (includes signed URL handling)
	const formValues = toFormValues(series);

	return (
		<SeriesForm
			defaultValues={formValues}
			tags={tags}
			onSubmit={handleSubmit}
			isPending={updateMutation.isPending}
			cancelHref={`/series/${seriesId}`}
			submitLabel="Save Changes"
		/>
	);
}
