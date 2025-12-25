"use client";

import { Button } from "@docix/ui/components/button";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { signUpMutationOptions } from "@/lib/api";

const signUpSchema = z.object({
	email: z.email("Invalid email address"),
	username: z
		.string()
		.min(3, "Username must be at least 3 characters long")
		.max(24, "Username must be at most 24 characters long"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters long")
		.max(64, "Password must be at most 64 characters long"),
});

export const SignUpForm = () => {
	const router = useRouter();
	const { mutate: signUp, isPending } = useMutation({
		...signUpMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			router.push("/auth/sign-in");
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				toast.error(
					error.response?.data.message || "An error occurred during sign up",
				);
			} else {
				toast.error("An unexpected error occurred during sign up");
			}
		},
	});
	const form = useAppForm({
		defaultValues: {
			username: "",
			email: "",
			password: "",
		},
		validators: {
			onSubmit: signUpSchema,
		},
		onSubmit: ({ value }) => signUp(value),
	});

	return (
		<form
			className="max-w-sm w-full"
			id="sign-up-form"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>Sign Up</CardTitle>
					<CardDescription>Create an account to get started.</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.AppField name="username">
							{(field) => <field.TextField label="Username" />}
						</form.AppField>
						<form.AppField name="email">
							{(field) => <field.TextField required label="Email" />}
						</form.AppField>
						<form.AppField name="password">
							{(field) => (
								<field.TextField required label="Password" type="password" />
							)}
						</form.AppField>
					</FieldGroup>
				</CardContent>

				<CardFooter className="flex flex-col">
					<form.AppForm>
						<form.SubscribeButton label="Sign Up" className="self-end" />
					</form.AppForm>

					<Button
						className="mt-4 mx-auto"
						variant="link"
						nativeButton={false}
						isLoading={isPending}
						render={
							<Link href="/auth/sign-in">Already have an account? Sign In</Link>
						}
					/>
				</CardFooter>
			</Card>
		</form>
	);
};
