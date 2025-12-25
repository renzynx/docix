"use client";

import { Spinner } from "@docix/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { queryKeys, signOutMutationOptions } from "@docix/api";

export default function SignOut() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { mutate: signOut } = useMutation({
		...signOutMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.setQueryData(queryKeys.currentSession, () => null);
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				toast.error(
					error.response?.data.message || "An error occurred during sign out",
				);
			} else {
				toast.error("An unexpected error occurred during sign out");
			}
		},
		onSettled: () => {
			router.replace("/");
		},
		retry: 0,
	});

	useQuery({
		queryKey: ["sign-out-query"],
		queryFn: () => {
			signOut();
			return true;
		},
		retry: 0,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4">
			<span className="text-lg font-medium text-foreground">
				Signing out...
			</span>
			<Spinner className="size-10 text-primary" />
		</div>
	);
}
