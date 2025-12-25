"use client";

import type { Role } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import { Spinner } from "@docix/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminListRolesQueryOptions } from "@/lib/api";
import { DeleteRoleDialog, RoleFormDialog, RolesTable } from "./_components";

export default function RolesPage() {
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);
	const [deletingRole, setDeletingRole] = useState<Role | null>(null);

	const { data: roles, isLoading } = useQuery(adminListRolesQueryOptions());

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Roles</h1>
					<p className="text-muted-foreground">Manage roles and permissions.</p>
				</div>
				<Button onClick={() => setIsCreateOpen(true)}>Add Role</Button>
			</div>

			{/* Roles Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Spinner className="size-8" />
				</div>
			) : (
				<RolesTable
					roles={roles || []}
					onEdit={setEditingRole}
					onDelete={setDeletingRole}
				/>
			)}

			{/* Create Role Dialog */}
			<RoleFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

			{/* Edit Role Dialog */}
			<RoleFormDialog
				role={editingRole}
				open={!!editingRole}
				onOpenChange={(open) => !open && setEditingRole(null)}
			/>

			{/* Delete Role Dialog */}
			<DeleteRoleDialog
				role={deletingRole}
				open={!!deletingRole}
				onOpenChange={(open) => !open && setDeletingRole(null)}
			/>
		</div>
	);
}
