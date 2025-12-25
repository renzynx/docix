"use client";

import { queryKeys, updateUserMutationOptions } from "@docix/api";
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
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { useSuspenseSession } from "@/hooks/use-session";

const changeEmailSchema = z.object({
	email: z.email("Invalid email address"),
});

export default function EmailCard() {
	const queryClient = useQueryClient();
	const { data } = useSuspenseSession();
	const user = data?.user;
	const { mutate, isPending } = useMutation({
		...updateUserMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.currentSession });
		},
	});
	const form = useAppForm({
		defaultValues: {
			email: user?.email ?? "",
		},
		validators: {
			onSubmit: changeEmailSchema,
		},
		onSubmit: ({ value }) => {
			if (value.email === user?.email) {
				toast.info("Email is unchanged.");
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
						<form.AppField name="email">
							{(field) => <field.TextField label="Email" />}
						</form.AppField>
					</FieldGroup>
				</CardContent>

				<CardFooter className="justify-between">
					<p className="text-muted-foreground text-sm">
						Please enter a valid email address.
					</p>
					<form.AppForm>
						<form.SubscribeButton label="Save" isLoading={isPending} />
					</form.AppForm>
				</CardFooter>
			</Card>
		</form>
	);
}
