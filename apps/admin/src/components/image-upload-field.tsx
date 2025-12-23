"use client";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@docix/ui/components/field";
import {
	Cancel01Icon,
	CloudUploadIcon,
	Image01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import Image from "next/image";
import {
	type ChangeEvent,
	type DragEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useFieldContext } from "@/contexts/form-context";
import {
	createEmptyImageValue,
	createImageValueFromFile,
	type ImageValue,
	revokeImagePreview,
} from "@/lib/upload";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImageUploadFieldProps {
	label: string;
	description?: string;
	required?: boolean;
}

export function ImageUploadField({
	label,
	description,
	required,
}: ImageUploadFieldProps) {
	const field = useFieldContext<ImageValue>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	const [isDragging, setIsDragging] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const currentValue = field.state.value;

	// Cleanup blob URLs on unmount or when value changes
	useEffect(() => {
		return () => {
			if (currentValue?.pendingFile && currentValue?.previewUrl) {
				revokeImagePreview(currentValue);
			}
		};
	}, [currentValue]);

	const handleFile = useCallback(
		(file: File) => {
			// Validate file type
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setValidationError(
					"Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
				);
				return;
			}

			// Validate file size
			if (file.size > MAX_FILE_SIZE) {
				setValidationError("File too large. Maximum size is 10MB.");
				return;
			}

			setValidationError(null);

			// Revoke old preview URL if exists
			if (currentValue?.pendingFile) {
				revokeImagePreview(currentValue);
			}

			// Create new image value with pending file and preview
			const newValue = createImageValueFromFile(file);
			field.handleChange(newValue);
		},
		[field, currentValue],
	);

	const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const file = e.dataTransfer.files[0];
			if (file) {
				handleFile(file);
			}
		},
		[handleFile],
	);

	const handleInputChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleFile(file);
			}
			// Reset input so the same file can be selected again
			e.target.value = "";
		},
		[handleFile],
	);

	const handleClick = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleRemove = useCallback(() => {
		// Revoke preview URL if it's a blob
		if (currentValue?.pendingFile) {
			revokeImagePreview(currentValue);
		}
		field.handleChange(createEmptyImageValue());
		setValidationError(null);
	}, [field, currentValue]);

	const hasImage = currentValue?.previewUrl;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>
				{label}
				<span className="text-destructive">{required ? " *" : ""}</span>
			</FieldLabel>

			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_TYPES.join(",")}
				onChange={handleInputChange}
				className="hidden"
				tabIndex={-1}
			/>

			{hasImage && currentValue.previewUrl ? (
				// Preview mode
				<div className="relative group rounded-lg border overflow-hidden bg-muted/30">
					<div className="aspect-[3/4] max-w-48 relative">
						<Image
							src={currentValue.previewUrl}
							alt="Image preview"
							fill
							className="object-cover"
							unoptimized // Blob URLs and CDN URLs don't need optimization
						/>
						{currentValue.pendingFile && (
							<div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 text-xs text-muted-foreground">
								Not uploaded yet
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={handleRemove}
						className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
						aria-label="Remove image"
					>
						<HugeiconsIcon icon={Cancel01Icon} size={16} />
					</button>
				</div>
			) : (
				// Upload mode
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={handleClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							handleClick();
						}
					}}
					role="button"
					tabIndex={0}
					className={`
						relative flex flex-col items-center justify-center gap-3 p-8
						border-2 border-dashed rounded-lg cursor-pointer
						transition-colors duration-200
						${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
					`}
				>
					<div className="p-3 rounded-full bg-muted">
						<HugeiconsIcon
							icon={isDragging ? CloudUploadIcon : Image01Icon}
							size={24}
							className="text-muted-foreground"
						/>
					</div>
					<div className="text-center">
						<p className="text-sm font-medium">
							{isDragging
								? "Drop image here"
								: "Click to upload or drag and drop"}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							JPEG, PNG, GIF or WebP (max 10MB)
						</p>
					</div>
				</div>
			)}

			{description && <FieldDescription>{description}</FieldDescription>}
			{validationError && (
				<p className="text-sm text-destructive mt-1">{validationError}</p>
			)}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}
