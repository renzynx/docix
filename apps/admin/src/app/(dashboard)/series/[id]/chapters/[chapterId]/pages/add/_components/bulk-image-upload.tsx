"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CloudUploadIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	type ChangeEvent,
	type DragEvent,
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	ImageCardOverlay,
	SortableImageCard,
} from "@/components/sortable-image-card";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface PendingPage {
	id: string;
	file: File;
	previewUrl: string;
	number: number;
}

interface BulkImageUploadProps {
	pendingPages: PendingPage[];
	onPagesChange: (pages: PendingPage[]) => void;
	startingNumber: number;
}

export function BulkImageUpload({
	pendingPages,
	onPagesChange,
	startingNumber,
}: BulkImageUploadProps) {
	const [isDraggingFile, setIsDraggingFile] = useState(false);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);

	// Find active page for overlay
	const activePage = activeId
		? pendingPages.find((p) => p.id === activeId)
		: null;

	// Configure sensors for pointer and keyboard
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // 8px movement before drag starts
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Cleanup blob URLs on unmount
	useEffect(() => {
		return () => {
			for (const page of pendingPages) {
				URL.revokeObjectURL(page.previewUrl);
			}
		};
	}, [pendingPages]);

	const handleFiles = useCallback(
		(files: FileList | File[]) => {
			const fileArray = Array.from(files);
			const errors: string[] = [];
			const validFiles: File[] = [];

			for (const file of fileArray) {
				if (!ACCEPTED_TYPES.includes(file.type)) {
					errors.push(`${file.name}: Invalid file type`);
					continue;
				}
				if (file.size > MAX_FILE_SIZE) {
					errors.push(`${file.name}: File too large (max 10MB)`);
					continue;
				}
				validFiles.push(file);
			}

			setValidationErrors(errors);

			if (validFiles.length === 0) return;

			// Sort files by name for consistent ordering
			validFiles.sort((a, b) =>
				a.name.localeCompare(b.name, undefined, { numeric: true }),
			);

			// Create pending pages with sequential numbers
			const currentMaxNumber =
				pendingPages.length > 0
					? Math.max(...pendingPages.map((p) => p.number))
					: startingNumber - 1;

			const newPages: PendingPage[] = validFiles.map((file, index) => ({
				id: crypto.randomUUID(),
				file,
				previewUrl: URL.createObjectURL(file),
				number: currentMaxNumber + index + 1,
			}));

			onPagesChange([...pendingPages, ...newPages]);
		},
		[pendingPages, onPagesChange, startingNumber],
	);

	const handleDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingFile(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingFile(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLLabelElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDraggingFile(false);
			handleFiles(e.dataTransfer.files);
		},
		[handleFiles],
	);

	const handleInputChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				handleFiles(e.target.files);
			}
			e.target.value = "";
		},
		[handleFiles],
	);

	const handleRemove = useCallback(
		(id: string) => {
			const page = pendingPages.find((p) => p.id === id);
			if (page) {
				URL.revokeObjectURL(page.previewUrl);
			}

			// Remove the page and renumber remaining pages
			const remaining = pendingPages.filter((p) => p.id !== id);
			const renumbered = remaining.map((p, index) => ({
				...p,
				number: startingNumber + index,
			}));

			onPagesChange(renumbered);
		},
		[pendingPages, onPagesChange, startingNumber],
	);

	const handleClearAll = useCallback(() => {
		for (const page of pendingPages) {
			URL.revokeObjectURL(page.previewUrl);
		}
		onPagesChange([]);
		setValidationErrors([]);
	}, [pendingPages, onPagesChange]);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over || active.id === over.id) {
			return;
		}

		// Find indices
		const oldIndex = pendingPages.findIndex((p) => p.id === active.id);
		const newIndex = pendingPages.findIndex((p) => p.id === over.id);

		if (oldIndex === -1 || newIndex === -1) {
			return;
		}

		// Reorder the array and renumber
		const reorderedPages = arrayMove(pendingPages, oldIndex, newIndex);
		const renumbered = reorderedPages.map((p, index) => ({
			...p,
			number: startingNumber + index,
		}));

		onPagesChange(renumbered);
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	return (
		<div className="space-y-4">
			{/* Drop zone */}
			<label
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`
					relative flex flex-col items-center justify-center gap-3 p-8
					border-2 border-dashed rounded-lg cursor-pointer
					transition-colors duration-200
					${isDraggingFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
				`}
			>
				<input
					type="file"
					accept={ACCEPTED_TYPES.join(",")}
					multiple
					onChange={handleInputChange}
					className="sr-only"
				/>
				<div className="p-3 rounded-full bg-muted">
					<HugeiconsIcon
						icon={isDraggingFile ? CloudUploadIcon : Image01Icon}
						size={24}
						className="text-muted-foreground"
					/>
				</div>
				<div className="text-center pointer-events-none">
					<p className="text-sm font-medium">
						{isDraggingFile
							? "Drop images here"
							: "Click to upload or drag and drop multiple images"}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						JPEG, PNG, GIF or WebP (max 10MB each)
					</p>
				</div>
			</label>

			{/* Validation errors */}
			{validationErrors.length > 0 && (
				<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					<p className="font-medium mb-1">Some files were skipped:</p>
					<ul className="list-disc list-inside">
						{validationErrors.map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</div>
			)}

			{/* Preview grid with drag-and-drop reordering */}
			{pendingPages.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							{pendingPages.length} page{pendingPages.length !== 1 ? "s" : ""}{" "}
							selected — drag to reorder
						</p>
						<button
							type="button"
							onClick={handleClearAll}
							className="text-sm text-destructive hover:underline"
						>
							Clear all
						</button>
					</div>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						onDragCancel={handleDragCancel}
					>
						<SortableContext
							items={pendingPages.map((p) => p.id)}
							strategy={rectSortingStrategy}
						>
							<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
								{pendingPages.map((page) => (
									<SortableImageCard
										key={page.id}
										item={page}
										imageUrl={page.previewUrl}
										onRemove={handleRemove}
									/>
								))}
							</div>
						</SortableContext>

						{/* Drag overlay for smooth visual feedback */}
						<DragOverlay>
							{activePage && (
								<ImageCardOverlay
									imageUrl={activePage.previewUrl}
									number={activePage.number}
								/>
							)}
						</DragOverlay>
					</DndContext>
				</div>
			)}
		</div>
	);
}
