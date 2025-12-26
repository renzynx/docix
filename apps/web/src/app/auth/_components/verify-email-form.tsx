"use client";

import {
	resendVerificationMutationOptions,
	verifyEmailMutationOptions,
} from "@docix/api";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useAppForm } from "@/hooks/use-app-form";

const verifyEmailSchema = z.object({
	token: z.string().min(1, "Verification token is required"),
});

const resendSchema = z.object({
	email: z.email("Invalid email address"),
});

function VerifyEmailFormContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [showResend, setShowResend] = useState(false);

	const initialToken = searchParams.get("token") || "";
	const initialEmail = searchParams.get("email") || "";

	const { mutate: verifyEmail, isPending: isVerifying } = useMutation({
		...verifyEmailMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			router.push("/auth/sign-in");
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				toast.error(
					error.response?.data.message ||
						"An error occurred during verification",
				);
			} else {
				toast.error("An unexpected error occurred during verification");
			}
		},
	});

	const { mutate: resendVerification, isPending: isResending } = useMutation({
		...resendVerificationMutationOptions(),
		onSuccess: (data) => {
			toast.success(data.message);
			if (data.token) {
				verifyForm.setFieldValue("token", data.token);
				setShowResend(false);
			}
		},
		onError: (error) => {
			if (error instanceof AxiosError) {
				toast.error(
					error.response?.data.message ||
						"An error occurred while resending verification",
				);
			} else {
				toast.error("An unexpected error occurred");
			}
		},
	});

	const verifyForm = useAppForm({
		defaultValues: {
			token: initialToken,
		},
		validators: {
			onSubmit: verifyEmailSchema,
		},
		onSubmit: ({ value }) => verifyEmail(value),
	});

	const resendForm = useAppForm({
		defaultValues: {
			email: initialEmail,
		},
		validators: {
			onSubmit: resendSchema,
		},
		onSubmit: ({ value }) => resendVerification(value),
	});

	useEffect(() => {
		if (initialToken) {
			verifyEmail({ token: initialToken });
		}
	}, [initialToken, verifyEmail]);

	if (showResend) {
		return (
			<form
				className="max-w-sm w-full"
				id="resend-verification-form"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					resendForm.handleSubmit();
				}}
			>
				<Card>
					<CardHeader>
						<CardTitle>Resend Verification</CardTitle>
						<CardDescription>
							Enter your email to receive a new verification link.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<resendForm.AppField name="email">
								{(field) => <field.TextField required label="Email" />}
							</resendForm.AppField>
						</FieldGroup>
					</CardContent>

					<CardFooter className="flex flex-col">
						<resendForm.AppForm>
							<resendForm.SubscribeButton
								label="Resend Verification"
								className="self-end"
							/>
						</resendForm.AppForm>

						<Button
							className="mt-4 mx-auto"
							variant="link"
							type="button"
							disabled={isResending}
							onClick={() => setShowResend(false)}
						>
							Back to verification
						</Button>
					</CardFooter>
				</Card>
			</form>
		);
	}

	return (
		<form
			className="max-w-sm w-full"
			id="verify-email-form"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				verifyForm.handleSubmit();
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle>Verify Email</CardTitle>
					<CardDescription>
						Enter the verification token from your email or click the link sent
						to your inbox.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<verifyForm.AppField name="token">
							{(field) => (
								<field.TextField required label="Verification Token" />
							)}
						</verifyForm.AppField>
					</FieldGroup>
				</CardContent>

				<CardFooter className="flex flex-col gap-2">
					<verifyForm.AppForm>
						<verifyForm.SubscribeButton
							label="Verify Email"
							className="self-end"
						/>
					</verifyForm.AppForm>

					<div className="flex flex-col items-center gap-2 mt-4">
						<Button
							className="mx-auto"
							variant="link"
							type="button"
							disabled={isVerifying}
							onClick={() => setShowResend(true)}
						>
							Didn't receive the email? Resend
						</Button>

						<Button
							className="mx-auto"
							variant="link"
							nativeButton={false}
							isLoading={isVerifying}
							render={
								<Link href="/auth/sign-in">Already verified? Sign In</Link>
							}
						/>
					</div>
				</CardFooter>
			</Card>
		</form>
	);
}

export const VerifyEmailForm = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<VerifyEmailFormContent />
		</Suspense>
	);
};
