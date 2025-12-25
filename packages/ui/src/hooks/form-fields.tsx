"use client";

import { EyeIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import type React from "react";
import { type ComponentProps, useState } from "react";
import { Button, type ButtonProps } from "../components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "../components/field";
import { Input } from "../components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../components/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/select";
import { Switch } from "../components/switch";
import { Textarea } from "../components/textarea";
import { useFieldContext, useFormContext } from "./form-context";

export function SubscribeButton({
	label,
	disabled,
	isLoading: externalLoading = false,
	...props
}: {
	label: string;
	isLoading?: boolean;
} & Omit<ButtonProps, "type" | "isLoading" | "children">) {
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
	showPasswordToggle = false,
	labelExtra,
	disabled,
	...props
}: {
	label: string;
	description?: string;
	showPasswordToggle?: boolean;
	labelExtra?: React.ReactNode;
	disabled?: boolean;
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
				{labelExtra}
			</div>
			{props.type === "password" ? (
				<InputGroup>
					<InputGroupInput
						aria-invalid={isInvalid}
						name={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(e) => field.handleChange(e.target.value)}
						disabled={disabled}
						{...props}
						type={showPassword ? "text" : "password"}
					/>
					{showPasswordToggle && (
						<InputGroupAddon align="inline-end">
							<HugeiconsIcon
								onClick={() => setShowPassword((prev) => !prev)}
								icon={showPassword ? EyeIcon : ViewIcon}
							/>
						</InputGroupAddon>
					)}
				</InputGroup>
			) : (
				<Input
					aria-invalid={isInvalid}
					name={field.name}
					type="text"
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
					disabled={disabled}
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
	disabled,
	...props
}: {
	label: string;
	description?: string;
	rows?: number;
	disabled?: boolean;
} & ComponentProps<typeof Textarea>) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				aria-invalid={isInvalid}
				name={field.name}
				value={field.state.value}
				rows={rows}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				disabled={disabled}
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
	disabled,
	...props
}: {
	label: string;
	description?: string;
	required?: boolean;
	step?: number;
	min?: number;
	max?: number;
	disabled?: boolean;
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
				disabled={disabled}
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

export function SwitchField({
	label,
	description,
}: {
	label: string;
	description?: string;
}) {
	const field = useFieldContext<boolean>();

	return (
		<div className="flex items-center justify-between">
			<div className="space-y-0.5">
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
			/>
		</div>
	);
}
