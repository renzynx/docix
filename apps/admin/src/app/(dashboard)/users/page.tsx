"use client";

import { adminListUsersQueryOptions } from "@docix/api";
import type { User } from "@docix/types";
import { Input } from "@docix/ui/components/input";
import { Spinner } from "@docix/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BanUserDialog, UserRolesDialog, UsersTable } from "./_components";

export default function UsersPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [banDialogUser, setBanDialogUser] = useState<User | null>(null);
	const [rolesDialogUser, setRolesDialogUser] = useState<User | null>(null);

	const { data: usersResponse, isLoading } = useQuery(
		adminListUsersQueryOptions(),
	);

	// Filter users based on search query
	const filteredUsers = useMemo(() => {
		if (!usersResponse?.data) return [];
		if (!searchQuery.trim()) return usersResponse.data;

		const query = searchQuery.toLowerCase();
		return usersResponse.data.filter(
			(user) =>
				user.email.toLowerCase().includes(query) ||
				user.username?.toLowerCase().includes(query),
		);
	}, [usersResponse, searchQuery]);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Users</h1>
				<p className="text-muted-foreground">
					Manage user accounts and permissions.
				</p>
			</div>

			{/* Search */}
			<div className="flex items-center gap-4">
				<Input
					placeholder="Search by email or username..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="max-w-sm"
				/>
				{usersResponse && (
					<span className="text-sm text-muted-foreground">
						{filteredUsers.length} of {usersResponse.total} users
					</span>
				)}
			</div>

			{/* Users Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Spinner className="size-8" />
				</div>
			) : (
				<UsersTable
					users={filteredUsers}
					onBanUser={setBanDialogUser}
					onManageRoles={setRolesDialogUser}
				/>
			)}

			{/* Ban User Dialog */}
			<BanUserDialog
				user={banDialogUser}
				open={!!banDialogUser}
				onOpenChange={(open) => !open && setBanDialogUser(null)}
			/>

			{/* Manage Roles Dialog */}
			<UserRolesDialog
				user={rolesDialogUser}
				open={!!rolesDialogUser}
				onOpenChange={(open) => !open && setRolesDialogUser(null)}
			/>
		</div>
	);
}
