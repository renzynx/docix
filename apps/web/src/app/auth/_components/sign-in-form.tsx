"use client";

import { signInMutationOptions } from "@docix/api";
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

const signInSchema = z.object({
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters long")
		.max(100, "Password must be at most 100 characters long"),
});

export const SignInForm = () => {
	const router = useRouter();
	const { mutate: signIn, isPending } = useMutation({
		...signInMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			router.push("/");
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				toast.error(
					error.response?.data.message || "An error occurred during sign in",
				);
			} else {
				toast.error("An unexpected error occurred during sign in");
			}
		},
	});
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: signInSchema,
		},
		onSubmit: ({ value }) => signIn(value),
	});

	return (
		<form
			className="max-w-sm w-full"
			id="sign-in-form"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>Sign In</CardTitle>
					<CardDescription>
						Please enter your credentials to sign in.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.AppField name="email">
							{(field) => <field.TextField required label="Email" />}
						</form.AppField>
						<form.AppField name="password">
							{(field) => (
								<field.TextField
									required
									label="Password"
									type="password"
									showForgotPassword
								/>
							)}
						</form.AppField>
					</FieldGroup>
				</CardContent>

				<CardFooter className="flex flex-col">
					<form.AppForm>
						<form.SubscribeButton label="Sign In" className="self-end" />
					</form.AppForm>

					<Button
						className="mt-4 mx-auto"
						variant="link"
						nativeButton={false}
						isLoading={isPending}
						render={
							<Link href="/auth/sign-up">Don't have an account? Sign Up</Link>
						}
					/>
				</CardFooter>
			</Card>
		</form>
	);
};
