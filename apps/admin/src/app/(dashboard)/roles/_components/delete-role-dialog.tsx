"use client";

import { adminDeleteRoleMutationOptions, queryKeys } from "@docix/api";
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
import { Spinner } from "@docix/ui/components/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RoleBadge } from "./role-badge";

interface DeleteRoleDialogProps {
	role: Role | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteRoleDialog({
	role,
	open,
	onOpenChange,
}: DeleteRoleDialogProps) {
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		...adminDeleteRoleMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles });
			queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
			onOpenChange(false);
			toast.success(`Role "${role?.display_name}" deleted successfully`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete role");
		},
	});

	const handleDelete = () => {
		if (!role) return;
		deleteMutation.mutate(role.id);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Role</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this role?
					</DialogDescription>
				</DialogHeader>

				{role && (
					<div className="py-4 space-y-4">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Role:</span>
							<RoleBadge role={role} />
						</div>

						<div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
							<p className="text-sm text-amber-800 dark:text-amber-200">
								⚠️ <strong>Warning:</strong> Deleting this role will remove it
								from all users who currently have it assigned. This action
								cannot be undone.
							</p>
						</div>

						{role.permissions && role.permissions.length > 0 && (
							<p className="text-sm text-muted-foreground">
								This role has {role.permissions.length} permissions that will no
								longer be available to affected users.
							</p>
						)}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending && <Spinner className="mr-2" />}
						Delete Role
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
