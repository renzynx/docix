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
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { api, signInMutationOptions } from "@/lib/api.generated";

const signInSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters long")
		.max(100, "Password must be at most 100 characters long"),
});

function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/";

	const { mutate: signIn } = useMutation({
		...signInMutationOptions(),
		onSuccess: async () => {
			// Don't show success toast yet - need to verify admin access first
			try {
				const permData = await api.get("/auth/permissions");
				const permissions: string[] = permData.data.permissions || [];
				const roles: string[] = permData.data.roles || [];

				const hasAdminAccess =
					roles.includes("admin") ||
					permissions.some((p) => p.startsWith("admin:") || p === "*");

				if (!hasAdminAccess) {
					// User signed in but doesn't have admin access
					router.push("/auth/forbidden");
					return;
				}

				// Only show success toast after confirming admin access
				toast.success("Welcome to the admin dashboard");
				router.push(callbackUrl);
			} catch {
				// If we can't verify permissions, try the callback anyway
				// The dashboard layout will handle it
				router.push(callbackUrl);
			}
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
			id="admin-sign-in-form"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Admin Sign In</CardTitle>
					<CardDescription>
						Sign in to access the Docix admin dashboard
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
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
						<form.SubscribeButton label="Sign In" className="w-full" />
					</form.AppForm>
				</CardFooter>
			</Card>
		</form>
	);
}

export default function AdminSignInPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center py-2">
			<Suspense fallback={<div>Loading...</div>}>
				<SignInForm />
			</Suspense>
		</div>
	);
}
