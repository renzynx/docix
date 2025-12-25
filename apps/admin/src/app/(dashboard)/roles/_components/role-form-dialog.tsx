"use client";

import {
	adminCreateRoleMutationOptions,
	adminGetPermissionsQueryOptions,
	adminUpdateRoleMutationOptions,
	queryKeys,
} from "@docix/api";
import type { Role } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@docix/ui/components/dialog";
import { Input } from "@docix/ui/components/input";
import { Label } from "@docix/ui/components/label";
import { Spinner } from "@docix/ui/components/spinner";
import { Textarea } from "@docix/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PermissionSelector } from "./permission-selector";

interface RoleFormDialogProps {
	role?: Role | null; // null/undefined = create mode, Role = edit mode
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RoleFormDialog({
	role,
	open,
	onOpenChange,
}: RoleFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditMode = !!role;

	// Form state
	const [name, setName] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState("#888888");
	const [priority, setPriority] = useState(10);
	const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

	// Fetch all available permissions
	const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery(
		adminGetPermissionsQueryOptions(),
	);

	// Reset form when role changes
	useEffect(() => {
		if (role) {
			setName(role.name);
			setDisplayName(role.display_name);
			setDescription(role.description || "");
			setColor(role.color || "#888888");
			setPriority(role.priority);
			setSelectedPermissions(role.permissions || []);
		} else {
			setName("");
			setDisplayName("");
			setDescription("");
			setColor("#888888");
			setPriority(10);
			setSelectedPermissions([]);
		}
	}, [role]);

	const createMutation = useMutation({
		...adminCreateRoleMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles });
			onOpenChange(false);
			toast.success("Role created successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create role");
		},
	});

	const updateMutation = useMutation({
		...adminUpdateRoleMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles });
			onOpenChange(false);
			toast.success("Role updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update role");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim() || !displayName.trim()) {
			toast.error("Name and display name are required");
			return;
		}

		if (isEditMode && role) {
			updateMutation.mutate({
				id: role.id,
				display_name: displayName,
				description,
				color,
				priority,
				permissions: selectedPermissions,
			});
		} else {
			createMutation.mutate({
				name: name.toLowerCase().replace(/\s+/g, "_"),
				display_name: displayName,
				description,
				color,
				priority,
				permissions: selectedPermissions,
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const isSystemRole = role?.is_system ?? false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditMode ? "Edit Role" : "Create Role"}
						</DialogTitle>
						<DialogDescription>
							{isEditMode
								? `Update the role "${role?.display_name}"`
								: "Create a new role with custom permissions"}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-6 py-4">
						{/* Basic info row */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									placeholder="moderator"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={isEditMode || isSystemRole}
									required
								/>
								<p className="text-xs text-muted-foreground">
									Unique identifier (lowercase, no spaces)
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="displayName">
									Display Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="displayName"
									placeholder="Moderator"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									disabled={isSystemRole}
									required
								/>
							</div>
						</div>

						{/* Description */}
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								placeholder="Describe what this role is for..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={isSystemRole}
								rows={2}
							/>
						</div>

						{/* Color and Priority row */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="color">Badge Color</Label>
								<div className="flex items-center gap-2">
									<input
										type="color"
										id="color"
										value={color}
										onChange={(e) => setColor(e.target.value)}
										disabled={isSystemRole}
										className="h-10 w-14 cursor-pointer rounded border"
									/>
									<Input
										value={color}
										onChange={(e) => setColor(e.target.value)}
										disabled={isSystemRole}
										className="flex-1"
										placeholder="#888888"
									/>
								</div>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="priority">Priority</Label>
								<Input
									id="priority"
									type="number"
									min={0}
									max={999}
									value={priority}
									onChange={(e) => setPriority(Number(e.target.value))}
									disabled={isSystemRole}
								/>
								<p className="text-xs text-muted-foreground">
									Higher = more privileged (0-999)
								</p>
							</div>
						</div>

						{/* Permissions */}
						<div className="grid gap-2">
							<Label>Permissions</Label>
							{permissionsLoading ? (
								<div className="flex items-center justify-center py-8">
									<Spinner className="size-6" />
								</div>
							) : (
								<PermissionSelector
									allPermissions={allPermissions}
									selectedPermissions={selectedPermissions}
									onPermissionsChange={setSelectedPermissions}
									disabled={isSystemRole}
								/>
							)}
						</div>

						{isSystemRole && (
							<p className="text-sm text-amber-600 dark:text-amber-400">
								⚠️ System roles cannot be modified. You can only view their
								configuration.
							</p>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						{!isSystemRole && (
							<Button type="submit" disabled={isPending}>
								{isPending && <Spinner className="mr-2" />}
								{isEditMode ? "Save Changes" : "Create Role"}
							</Button>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
