"use client";

import { Button } from "@docix/ui/components/button";
import { Checkbox } from "@docix/ui/components/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@docix/ui/components/collapsible";
import { Input } from "@docix/ui/components/input";
import { cn } from "@docix/ui/lib/utils";
import { useMemo, useState } from "react";

interface PermissionSelectorProps {
	allPermissions: string[];
	selectedPermissions: string[];
	onPermissionsChange: (permissions: string[]) => void;
	disabled?: boolean;
}

// Permission descriptions for tooltips
const permissionDescriptions: Record<string, string> = {
	"manga:read": "View manga content",
	"manga:create": "Create new manga series",
	"manga:update": "Edit existing manga",
	"manga:delete": "Delete manga series",
	"manga:publish": "Publish manga series",
	"manga:unpublish": "Unpublish manga series",
	"manga:feature": "Feature manga on homepage",
	"manga:manage_tags": "Manage manga tags",
	"manga:bulk_actions": "Perform bulk operations",
	"chapter:read": "View chapters",
	"chapter:create": "Create new chapters",
	"chapter:update": "Edit chapters",
	"chapter:delete": "Delete chapters",
	"comment:read": "View comments",
	"comment:create": "Post comments",
	"comment:update": "Edit comments",
	"comment:delete": "Delete comments",
	"comment:pin": "Pin comments",
	"user:read": "View user profiles",
	"user:update": "Edit user profiles",
	"user:delete": "Delete user accounts",
	"user:ban": "Ban users",
	"user:unban": "Unban users",
	"user:manage": "Manage user settings",
	"user:view_ip": "View user IP addresses",
	"user:impersonate": "Impersonate users",
	"role:read": "View roles",
	"role:create": "Create roles",
	"role:update": "Edit roles",
	"role:delete": "Delete roles",
	"role:assign": "Assign roles to users",
	"report:read": "View reports",
	"report:resolve": "Resolve reports",
	"report:delete": "Delete reports",
	"bookmark:create": "Create bookmarks",
	"bookmark:delete": "Delete bookmarks",
	"bookmark:read": "View bookmarks",
	"history:read": "View reading history",
	"history:clear": "Clear reading history",
	"settings:read": "View settings",
	"settings:update": "Modify settings",
	"analytics:read": "View analytics",
	"upload:images": "Upload images",
	"upload:bulk": "Bulk upload files",
	"admin:panel": "Access admin panel",
	"admin:dashboard": "View admin dashboard",
	"admin:logs": "View system logs",
	"admin:backup": "Manage backups",
	"admin:maintenance": "Maintenance mode",
};

// Category display names
const categoryNames: Record<string, string> = {
	manga: "Manga",
	chapter: "Chapter",
	comment: "Comment",
	user: "User",
	role: "Role",
	report: "Report",
	bookmark: "Bookmark",
	history: "History",
	settings: "Settings",
	analytics: "Analytics",
	upload: "Upload",
	admin: "Admin",
};

function groupPermissionsByCategory(
	permissions: string[],
): Record<string, string[]> {
	const groups: Record<string, string[]> = {};

	for (const perm of permissions) {
		const parts = perm.split(":");
		const category = parts[0] ?? "other";
		if (!groups[category]) {
			groups[category] = [];
		}
		groups[category].push(perm);
	}

	return groups;
}

function formatPermissionName(permission: string): string {
	const parts = permission.split(":");
	const action = parts[1] ?? permission;
	return action
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function PermissionSelector({
	allPermissions,
	selectedPermissions,
	onPermissionsChange,
	disabled = false,
}: PermissionSelectorProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(Object.keys(categoryNames)),
	);

	const selectedSet = useMemo(
		() => new Set(selectedPermissions),
		[selectedPermissions],
	);

	const groupedPermissions = useMemo(
		() => groupPermissionsByCategory(allPermissions),
		[allPermissions],
	);

	const filteredGroups = useMemo(() => {
		if (!searchQuery.trim()) return groupedPermissions;

		const query = searchQuery.toLowerCase();
		const filtered: Record<string, string[]> = {};

		for (const [category, perms] of Object.entries(groupedPermissions)) {
			const matchingPerms = perms.filter(
				(perm) =>
					perm.toLowerCase().includes(query) ||
					permissionDescriptions[perm]?.toLowerCase().includes(query),
			);
			if (matchingPerms.length > 0) {
				filtered[category] = matchingPerms;
			}
		}

		return filtered;
	}, [groupedPermissions, searchQuery]);

	const togglePermission = (permission: string) => {
		if (disabled) return;

		const newSelected = new Set(selectedPermissions);
		if (newSelected.has(permission)) {
			newSelected.delete(permission);
		} else {
			newSelected.add(permission);
		}
		onPermissionsChange([...newSelected]);
	};

	const toggleCategory = (perms: string[]) => {
		if (disabled) return;

		const allSelected = perms.every((p) => selectedSet.has(p));
		const newSelected = new Set(selectedPermissions);

		if (allSelected) {
			// Deselect all in category
			for (const perm of perms) {
				newSelected.delete(perm);
			}
		} else {
			// Select all in category
			for (const perm of perms) {
				newSelected.add(perm);
			}
		}

		onPermissionsChange([...newSelected]);
	};

	const toggleExpandCategory = (category: string) => {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(category)) {
			newExpanded.delete(category);
		} else {
			newExpanded.add(category);
		}
		setExpandedCategories(newExpanded);
	};

	const selectAll = () => {
		if (disabled) return;
		onPermissionsChange([...allPermissions]);
	};

	const deselectAll = () => {
		if (disabled) return;
		onPermissionsChange([]);
	};

	return (
		<div className="space-y-4">
			{/* Search and bulk actions */}
			<div className="flex items-center gap-2">
				<Input
					placeholder="Search permissions..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="flex-1"
					disabled={disabled}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={selectAll}
					disabled={disabled}
				>
					Select All
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={deselectAll}
					disabled={disabled}
				>
					Clear
				</Button>
			</div>

			{/* Selected count */}
			<p className="text-sm text-muted-foreground">
				{selectedPermissions.length} of {allPermissions.length} permissions
				selected
			</p>

			{/* Permission groups */}
			<div className="max-h-[400px] space-y-2 overflow-y-auto rounded-md border p-2">
				{Object.entries(filteredGroups).map(([category, perms]) => {
					const isExpanded = expandedCategories.has(category);
					const allSelected = perms.every((p) => selectedSet.has(p));
					const someSelected = perms.some((p) => selectedSet.has(p));

					return (
						<Collapsible
							key={category}
							open={isExpanded}
							onOpenChange={() => toggleExpandCategory(category)}
							className="rounded-md border"
						>
							{/* Category header */}
							<div className="flex items-center gap-3 p-3">
								<Checkbox
									checked={allSelected}
									indeterminate={someSelected && !allSelected}
									onCheckedChange={() => toggleCategory(perms)}
									disabled={disabled}
								/>
								<CollapsibleTrigger className="flex flex-1 items-center justify-between">
									<span className="font-medium">
										{categoryNames[category] || category}
									</span>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">
											{perms.filter((p) => selectedSet.has(p)).length}/
											{perms.length}
										</span>
										<span className="text-muted-foreground">
											{isExpanded ? "▼" : "▶"}
										</span>
									</div>
								</CollapsibleTrigger>
							</div>

							{/* Permissions list */}
							<CollapsibleContent className="border-t p-2">
								<div className="space-y-1">
									{perms.map((perm) => (
										<label
											key={perm}
											className={cn(
												"flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50",
												disabled && "cursor-not-allowed opacity-50",
											)}
										>
											<Checkbox
												checked={selectedSet.has(perm)}
												onCheckedChange={() => togglePermission(perm)}
												disabled={disabled}
											/>
											<div className="grid flex-1 gap-0.5">
												<span className="text-sm font-medium">
													{formatPermissionName(perm)}
												</span>
												<span className="text-xs text-muted-foreground">
													{permissionDescriptions[perm] || perm}
												</span>
											</div>
										</label>
									))}
								</div>
							</CollapsibleContent>
						</Collapsible>
					);
				})}

				{Object.keys(filteredGroups).length === 0 && (
					<p className="py-8 text-center text-muted-foreground">
						No permissions found matching "{searchQuery}"
					</p>
				)}
			</div>
		</div>
	);
}
