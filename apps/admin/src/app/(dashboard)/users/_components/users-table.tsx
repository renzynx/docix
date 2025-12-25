"use client";

import type { User } from "@docix/types";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@docix/ui/components/avatar";
import { Badge } from "@docix/ui/components/badge";
import { Button } from "@docix/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@docix/ui/components/table";
import { UserStatusBadge } from "./user-status-badge";

interface UsersTableProps {
	users: User[];
	onBanUser: (user: User) => void;
	onManageRoles: (user: User) => void;
}

function getInitials(user: User): string {
	if (user.username) {
		return user.username.slice(0, 2).toUpperCase();
	}
	return user.email.slice(0, 2).toUpperCase();
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function UsersTable({
	users,
	onBanUser,
	onManageRoles,
}: UsersTableProps) {
	if (users.length === 0) {
		return (
			<div className="rounded-lg border p-8 text-center text-muted-foreground">
				No users found.
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>Roles</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Created</TableHead>
						<TableHead className="w-[150px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell>
								<div className="flex items-center gap-3">
									<Avatar size="sm">
										{user.avatar && (
											<AvatarImage
												src={user.avatar}
												alt={user.username || user.email}
											/>
										)}
										<AvatarFallback>{getInitials(user)}</AvatarFallback>
									</Avatar>
									<div className="grid gap-0.5">
										<span className="font-medium">
											{user.username || "No username"}
										</span>
										<span className="text-xs text-muted-foreground">
											{user.email}
										</span>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex flex-wrap gap-1">
									{user.roles && user.roles.length > 0 ? (
										user.roles.map((role) => (
											<Badge
												key={role.id}
												variant="outline"
												style={{
													backgroundColor: role.color
														? `${role.color}20`
														: undefined,
													color: role.color || undefined,
													borderColor: role.color || undefined,
												}}
											>
												{role.display_name || role.name}
											</Badge>
										))
									) : (
										<span className="text-xs text-muted-foreground">
											No roles
										</span>
									)}
								</div>
							</TableCell>
							<TableCell>
								<UserStatusBadge user={user} />
							</TableCell>
							<TableCell className="text-muted-foreground">
								{formatDate(user.created_at)}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onManageRoles(user)}
									>
										Roles
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className={
											user.is_banned ? "text-green-600" : "text-destructive"
										}
										onClick={() => onBanUser(user)}
									>
										{user.is_banned ? "Unban" : "Ban"}
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
