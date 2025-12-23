"use client";

import { Button, type ButtonProps } from "@docix/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@docix/ui/components/field";
import { Input } from "@docix/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@docix/ui/components/input-group";
import { Textarea as ShadcnTextArea } from "@docix/ui/components/textarea";
import { EyeIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import Link from "next/link";
import { type ComponentProps, useState } from "react";
import { useFieldContext, useFormContext } from "@/contexts/form-context";

export function SubscribeButton({
	label,
	isLoading: externalLoading = false,
	disabled,
	...props
}: {
	label: string;
} & Omit<ButtonProps, "type" | "children">) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					type="submit"
					isLoading={isSubmitting || externalLoading}
					disabled={disabled}
					{...props}
				>
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

export function TextField({
	label,
	description,
	showForgotPassword = false,
	...props
}: {
	label: string;
	description?: string;
	showForgotPassword?: boolean;
} & ComponentProps<typeof Input>) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	const [showPassword, setShowPassword] = useState(false);

	return (
		<Field data-invalid={isInvalid}>
			<div className="flex justify-between">
				<FieldLabel htmlFor={field.name}>
					{label}
					<span className="text-destructive">{props.required ? " *" : ""}</span>
				</FieldLabel>
				{showForgotPassword && (
					<Button
						variant="link"
						nativeButton={false}
						render={<Link href="/auth/forgot-password">Forgot password?</Link>}
					/>
				)}
			</div>
			{props.type === "password" ? (
				<InputGroup>
					<InputGroupInput
						aria-invalid={isInvalid}
						name={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(e) => field.handleChange(e.target.value)}
						{...props}
						type={showPassword ? "text" : "password"}
					/>
					<InputGroupAddon align="inline-end">
						<HugeiconsIcon
							onClick={() => setShowPassword((prev) => !prev)}
							icon={showPassword ? EyeIcon : ViewIcon}
						/>
					</InputGroupAddon>
				</InputGroup>
			) : (
				<Input
					aria-invalid={isInvalid}
					name={field.name}
					type="text"
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
					{...props}
				/>
			)}
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export function TextArea({
	label,
	description,
	rows = 3,
	...props
}: {
	label: string;
	description?: string;
	rows?: number;
} & ComponentProps<typeof ShadcnTextArea>) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<ShadcnTextArea
				aria-invalid={isInvalid}
				name={field.name}
				value={field.state.value}
				rows={rows}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				{...props}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}
