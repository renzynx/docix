"use client";

import type { User } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import { Checkbox } from "@docix/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@docix/ui/components/dialog";

import { Spinner } from "@docix/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	adminAssignRoleMutationOptions,
	adminListRolesQueryOptions,
	adminRemoveRoleMutationOptions,
	queryKeys,
} from "@/lib/api";

interface UserRolesDialogProps {
	user: User | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserRolesDialog({
	user,
	open,
	onOpenChange,
}: UserRolesDialogProps) {
	const queryClient = useQueryClient();
	const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
		new Set(),
	);

	const { data: allRoles, isLoading: rolesLoading } = useQuery(
		adminListRolesQueryOptions(),
	);

	// Sync selected roles when user changes
	useEffect(() => {
		if (user?.roles) {
			setSelectedRoleIds(new Set(user.roles.map((r) => r.id)));
		} else {
			setSelectedRoleIds(new Set());
		}
	}, [user]);

	const assignMutation = useMutation({
		...adminAssignRoleMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to assign role");
		},
	});

	const removeMutation = useMutation({
		...adminRemoveRoleMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to remove role");
		},
	});

	const handleRoleToggle = (roleId: string, checked: boolean) => {
		const newSet = new Set(selectedRoleIds);
		if (checked) {
			newSet.add(roleId);
		} else {
			newSet.delete(roleId);
		}
		setSelectedRoleIds(newSet);
	};

	const handleSave = async () => {
		if (!user) return;

		const currentRoleIds = new Set(user.roles?.map((r) => r.id) ?? []);
		const rolesToAdd = [...selectedRoleIds].filter(
			(id) => !currentRoleIds.has(id),
		);
		const rolesToRemove = [...currentRoleIds].filter(
			(id) => !selectedRoleIds.has(id),
		);

		try {
			// Process all role changes
			await Promise.all([
				...rolesToAdd.map((roleId) =>
					assignMutation.mutateAsync({ user_id: user.id, role_id: roleId }),
				),
				...rolesToRemove.map((roleId) =>
					removeMutation.mutateAsync({ user_id: user.id, role_id: roleId }),
				),
			]);

			toast.success("User roles updated successfully");
			onOpenChange(false);
		} catch {
			// Error already handled by mutation callbacks
		}
	};

	const isPending = assignMutation.isPending || removeMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Manage Roles</DialogTitle>
					<DialogDescription>
						Assign or remove roles for {user?.email}
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					{rolesLoading ? (
						<div className="flex items-center justify-center py-8">
							<Spinner className="size-6" />
						</div>
					) : allRoles && allRoles.length > 0 ? (
						<div className="space-y-3">
							{allRoles.map((role) => (
								<label
									key={role.id}
									className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
								>
									<Checkbox
										checked={selectedRoleIds.has(role.id)}
										onCheckedChange={(checked) =>
											handleRoleToggle(role.id, checked)
										}
										disabled={role.is_system && role.name === "admin"}
									/>
									<div className="grid gap-1">
										<div className="flex items-center gap-2">
											<Badge
												style={{
													backgroundColor: role.color
														? `${role.color}20`
														: undefined,
													color: role.color || undefined,
												}}
											>
												{role.display_name || role.name}
											</Badge>
											{role.is_system && (
												<span className="text-xs text-muted-foreground">
													(System)
												</span>
											)}
										</div>
										{role.description && (
											<p className="text-xs text-muted-foreground">
												{role.description}
											</p>
										)}
									</div>
								</label>
							))}
						</div>
					) : (
						<p className="text-center text-muted-foreground py-4">
							No roles available. Create roles in the Roles page first.
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
					<Button onClick={handleSave} disabled={isPending || rolesLoading}>
						{isPending && <Spinner className="mr-2" />}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
