"use client";

import type { Role } from "@docix/types";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@docix/ui/components/tooltip";
import { RoleBadge } from "./role-badge";

interface RolesTableProps {
	roles: Role[];
	onEdit: (role: Role) => void;
	onDelete: (role: Role) => void;
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function RolesTable({ roles, onEdit, onDelete }: RolesTableProps) {
	// Sort roles by priority descending (highest first)
	const sortedRoles = [...roles].sort((a, b) => b.priority - a.priority);

	if (sortedRoles.length === 0) {
		return (
			<div className="rounded-lg border p-8 text-center text-muted-foreground">
				No roles found. Create your first role to get started.
			</div>
		);
	}

	return (
		<TooltipProvider>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Role</TableHead>
							<TableHead>Name</TableHead>
							<TableHead className="text-center">Priority</TableHead>
							<TableHead>Permissions</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="w-[150px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedRoles.map((role) => (
							<TableRow key={role.id}>
								<TableCell>
									<RoleBadge role={role} showSystem />
								</TableCell>
								<TableCell className="font-mono text-sm text-muted-foreground">
									{role.name}
								</TableCell>
								<TableCell className="text-center">
									<Tooltip>
										<TooltipTrigger
											render={<Badge variant="outline" className="font-mono" />}
										>
											{role.priority}
										</TooltipTrigger>
										<TooltipContent>
											Higher priority = more privileges
										</TooltipContent>
									</Tooltip>
								</TableCell>
								<TableCell>
									<Tooltip>
										<TooltipTrigger
											render={<span className="cursor-help text-sm" />}
										>
											{role.permissions?.length || 0} permissions
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											{role.permissions && role.permissions.length > 0 ? (
												<div className="flex flex-wrap gap-1">
													{role.permissions.slice(0, 10).map((perm) => (
														<Badge
															key={perm}
															variant="secondary"
															className="text-xs"
														>
															{perm}
														</Badge>
													))}
													{role.permissions.length > 10 && (
														<span className="text-xs text-muted-foreground">
															+{role.permissions.length - 10} more
														</span>
													)}
												</div>
											) : (
												<span>No permissions assigned</span>
											)}
										</TooltipContent>
									</Tooltip>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{formatDate(role.created_at)}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEdit(role)}
										>
											{role.is_system ? "View" : "Edit"}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive"
											onClick={() => onDelete(role)}
											disabled={role.is_system}
										>
											Delete
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</TooltipProvider>
	);
}
