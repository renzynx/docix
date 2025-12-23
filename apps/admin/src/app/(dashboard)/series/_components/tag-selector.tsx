"use client";

import type { Tag } from "@docix/types";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
} from "@docix/ui/components/combobox";
import * as React from "react";

interface TagSelectorProps {
	tags: Tag[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
}

export function TagSelector({ tags, selectedIds, onChange }: TagSelectorProps) {
	const containerRef = React.useRef<HTMLDivElement | null>(null);

	// Convert selectedIds to Tag objects for the Combobox value
	const selectedTags = React.useMemo(
		() => tags.filter((tag) => selectedIds.includes(tag.id)),
		[tags, selectedIds],
	);

	const handleValueChange = React.useCallback(
		(value: Tag[]) => {
			onChange(value.map((tag) => tag.id));
		},
		[onChange],
	);

	if (tags.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No tags available. Create some tags first.
			</p>
		);
	}

	return (
		<Combobox
			multiple
			items={tags}
			value={selectedTags}
			onValueChange={handleValueChange}
			isItemEqualToValue={(a: Tag | null, b: Tag | null) => a?.id === b?.id}
		>
			<ComboboxChips ref={containerRef}>
				{selectedTags.map((tag) => (
					<ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>
				))}
				<ComboboxChipsInput
					placeholder={selectedTags.length > 0 ? "" : "Search tags..."}
				/>
			</ComboboxChips>

			<ComboboxContent anchor={containerRef}>
				<ComboboxList>
					{(tag: Tag) => (
						<ComboboxItem key={tag.id} value={tag}>
							{tag.name}
						</ComboboxItem>
					)}
				</ComboboxList>
				<ComboboxEmpty>No tags found.</ComboboxEmpty>
			</ComboboxContent>
		</Combobox>
	);
}
