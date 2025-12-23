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
import type { Page } from "@docix/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@docix/ui/components/dropdown-menu";
import {
	Delete02Icon,
	MoreVerticalIcon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import {
	ImageCardOverlay,
	SortableImageCard,
} from "@/components/sortable-image-card";

interface PageGridProps {
	pages: Page[];
	onReorder: (pageOrders: Array<{ page_id: string; number: number }>) => void;
	onDelete: (page: Page) => void;
}

export function PageGrid({ pages, onReorder, onDelete }: PageGridProps) {
	const [activeId, setActiveId] = useState<string | null>(null);

	// Sorted pages for display
	const sortedPages = [...pages].sort((a, b) => a.number - b.number);

	// Find active page for overlay
	const activePage = activeId
		? sortedPages.find((p) => p.id === activeId)
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
		const oldIndex = sortedPages.findIndex((p) => p.id === active.id);
		const newIndex = sortedPages.findIndex((p) => p.id === over.id);

		if (oldIndex === -1 || newIndex === -1) {
			return;
		}

		// Reorder the array locally to calculate new page numbers
		const reorderedPages = arrayMove(sortedPages, oldIndex, newIndex);

		// Create new page orders with updated numbers
		const pageOrders = reorderedPages.map((page, index) => ({
			page_id: page.id,
			number: index + 1,
		}));

		onReorder(pageOrders);
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const getDisplayUrl = (page: Page) => page.image_url_signed || page.image_url;

	const renderPageActions = (page: Page) => {
		const displayUrl = getDisplayUrl(page);

		const handleViewFullSize = () => {
			window.open(displayUrl, "_blank");
		};

		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					className="p-1.5 rounded-md bg-black/70 text-white hover:bg-black/90 transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					<HugeiconsIcon icon={MoreVerticalIcon} size={16} />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" sideOffset={4}>
					<DropdownMenuItem onClick={handleViewFullSize}>
						<HugeiconsIcon icon={ViewIcon} />
						<span>View Full Size</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => onDelete(page)}
					>
						<HugeiconsIcon icon={Delete02Icon} />
						<span>Delete</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	};

	if (sortedPages.length === 0) {
		return (
			<div className="rounded-lg border p-8 text-center text-muted-foreground">
				No pages yet. Add your first page to this chapter.
			</div>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<SortableContext
				items={sortedPages.map((p) => p.id)}
				strategy={rectSortingStrategy}
			>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{sortedPages.map((page) => (
						<SortableImageCard
							key={page.id}
							item={page}
							imageUrl={getDisplayUrl(page)}
							renderActions={renderPageActions}
						/>
					))}
				</div>
			</SortableContext>

			{/* Drag overlay for smooth visual feedback */}
			<DragOverlay>
				{activePage && (
					<ImageCardOverlay
						imageUrl={getDisplayUrl(activePage)}
						number={activePage.number}
					/>
				)}
			</DragOverlay>
		</DndContext>
	);
}
