"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	Cancel01Icon,
	Delete02Icon,
	MoreVerticalIcon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import type { ReactNode } from "react";

// Base item interface that both Page and PendingPage can satisfy
export interface SortableImageItem {
	id: string;
	number: number;
}

interface SortableImageCardProps<T extends SortableImageItem> {
	item: T;
	imageUrl: string;
	/** Render custom actions overlay (e.g., dropdown menu) */
	renderActions?: (item: T) => ReactNode;
	/** Simple remove button callback (mutually exclusive with renderActions) */
	onRemove?: (id: string) => void;
}

export function SortableImageCard<T extends SortableImageItem>({
	item,
	imageUrl,
	renderActions,
	onRemove,
}: SortableImageCardProps<T>) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group relative aspect-[2/3] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""}`}
			{...attributes}
			{...listeners}
		>
			<Image
				src={imageUrl}
				alt={`Page ${item.number}`}
				fill
				className="object-cover pointer-events-none"
				unoptimized
				draggable={false}
			/>
			{/* Page number badge */}
			<div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
				#{item.number}
			</div>
			{/* Actions */}
			{renderActions ? (
				<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
					{renderActions(item)}
				</div>
			) : onRemove ? (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(item.id);
					}}
					className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
					aria-label="Remove image"
				>
					<HugeiconsIcon icon={Cancel01Icon} size={14} />
				</button>
			) : null}
		</div>
	);
}

interface ImageCardOverlayProps {
	imageUrl: string;
	number: number;
}

export function ImageCardOverlay({ imageUrl, number }: ImageCardOverlayProps) {
	return (
		<div className="relative aspect-[2/3] w-32 rounded-lg overflow-hidden shadow-2xl ring-2 ring-primary rotate-3">
			<Image
				src={imageUrl}
				alt={`Page ${number}`}
				fill
				className="object-cover"
				unoptimized
			/>
			<div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
				#{number}
			</div>
		</div>
	);
}

// Re-export commonly used action components for convenience
export { Cancel01Icon, Delete02Icon, MoreVerticalIcon, ViewIcon };
