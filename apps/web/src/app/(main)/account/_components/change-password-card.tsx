"use client";

import { changePasswordMutationOptions } from "@docix/api";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { FieldGroup } from "@docix/ui/components/field";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";

const changePasswordSchema = z
	.object({
		passwordCurrent: z.string().min(1, "Current password must not be empty"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(64, "Password must be at most 64 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.superRefine((val, ctx) => {
		if (val.passwordCurrent === val.password) {
			ctx.addIssue({
				code: "custom",
				message: "New password must be different from current password",
				path: ["password"],
			});
		}

		if (val.password !== val.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			});
		}
	});

export default function ChangePasswordCard() {
	const { mutate, isPending } = useMutation({
		...changePasswordMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			form.reset();
		},
		onError: (err) => {
			if (err instanceof AxiosError) {
				toast.error(
					err.response?.data.message ||
						"An error occurred while changing the password.",
				);
			} else {
				toast.error("An unexpected error occurred.");
			}
		},
	});

	const form = useAppForm({
		defaultValues: {
			passwordCurrent: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: changePasswordSchema,
		},
		onSubmit: ({ value }) => {
			mutate({
				current_password: value.passwordCurrent,
				new_password: value.password,
			});
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
					<CardTitle>Change Password</CardTitle>
					<CardDescription>
						Enter your current password and a new password.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.AppField name="passwordCurrent">
							{(field) => (
								<field.TextField label="Current Password" type="password" />
							)}
						</form.AppField>

						<form.AppField name="password">
							{(field) => (
								<field.TextField label="New Password" type="password" />
							)}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => (
								<field.TextField label="Confirm Password" type="password" />
							)}
						</form.AppField>
					</FieldGroup>
				</CardContent>
				<CardFooter className="justify-between border-t">
					<p className="text-sm text-muted-foreground">
						Please use 8 characters at minimum.
					</p>
					<form.AppForm>
						<form.SubscribeButton label="Save" isLoading={isPending} />
					</form.AppForm>
				</CardFooter>
			</Card>
		</form>
	);
}
