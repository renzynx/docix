"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { FieldGroup } from "@docix/ui/components/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { useSuspenseSession } from "@/hooks/use-session";
import { queryKeys, updateUserMutationOptions } from "@docix/api";

const changeUsernameSchema = z.object({
	username: z
		.string()
		.min(3, "Username must be at least 3 characters long.")
		.max(30, "Username must be at most 30 characters long."),
});

export default function UsernameCard() {
	const queryClient = useQueryClient();
	const { data } = useSuspenseSession();
	const { mutate, isPending } = useMutation({
		...updateUserMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.currentSession });
		},
		onError: (err) => {
			if (err instanceof AxiosError) {
				toast.error(
					err.response?.data.message ||
						"An error occurred while updating the username.",
				);
			} else {
				console.log(err);
				toast.error("An unexpected error occurred.");
			}
		},
	});
	const form = useAppForm({
		defaultValues: {
			username: data?.user.username || "",
		},
		validators: {
			onSubmit: changeUsernameSchema,
		},
		onSubmit: ({ value }) => {
			if (value.username === data?.user.username) {
				toast.info("Username is unchanged.");
				return;
			}

			mutate(value);
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>Email</CardTitle>
					<CardDescription>Enter the email you want to login.</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.AppField name="username">
							{(field) => <field.TextField label="Username" />}
						</form.AppField>
					</FieldGroup>
				</CardContent>

				<CardFooter className="justify-between">
					<p className="text-muted-foreground text-sm">
						Please enter a username from 3-30 characters.
					</p>
					<form.AppForm>
						<form.SubscribeButton label="Save" isLoading={isPending} />
					</form.AppForm>
				</CardFooter>
			</Card>
		</form>
	);
}
