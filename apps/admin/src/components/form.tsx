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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@docix/ui/components/select";
import { Textarea as ShadcnTextArea } from "@docix/ui/components/textarea";
import { EyeIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import Link from "next/link";
import { type ComponentProps, useState } from "react";
import { useFieldContext, useFormContext } from "@/contexts/form-context";

export function SubscribeButton({
	label,
	disabled,
	...props
}: {
	label: string;
} & Omit<ButtonProps, "type" | "isLoading" | "children">) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					type="submit"
					isLoading={isSubmitting}
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

export function SelectField<T extends string>({
	label,
	description,
	options,
	required,
}: {
	label: string;
	description?: string;
	options: { value: T; label: string }[];
	required?: boolean;
}) {
	const field = useFieldContext<T>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>
				{label}
				<span className="text-destructive">{required ? " *" : ""}</span>
			</FieldLabel>
			<Select
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value as T)}
				items={options}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export function NumberField({
	label,
	description,
	required,
	step = 1,
	min,
	max,
	...props
}: {
	label: string;
	description?: string;
	required?: boolean;
	step?: number;
	min?: number;
	max?: number;
} & Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange">) {
	const field = useFieldContext<number>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>
				{label}
				<span className="text-destructive">{required ? " *" : ""}</span>
			</FieldLabel>
			<Input
				aria-invalid={isInvalid}
				name={field.name}
				type="number"
				step={step}
				min={min}
				max={max}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const value = e.target.value;
					if (value === "") {
						field.handleChange(0);
					} else {
						const num =
							step === 1
								? Number.parseInt(value, 10)
								: Number.parseFloat(value);
						if (!Number.isNaN(num)) {
							field.handleChange(num);
						}
					}
				}}
				{...props}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}
