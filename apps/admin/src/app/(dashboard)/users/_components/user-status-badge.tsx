import type { User } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { cn } from "@docix/ui/lib/utils";

type UserStatus = "active" | "banned" | "unverified";

function getUserStatus(user: User): UserStatus {
	if (user.is_banned) return "banned";
	if (!user.verified_at) return "unverified";
	return "active";
}

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
	active: {
		label: "Active",
		className: "bg-green-500/10 text-green-600 dark:text-green-400",
	},
	banned: {
		label: "Banned",
		className: "bg-red-500/10 text-red-600 dark:text-red-400",
	},
	unverified: {
		label: "Unverified",
		className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
	},
};

interface UserStatusBadgeProps {
	user: User;
	className?: string;
}

export function UserStatusBadge({ user, className }: UserStatusBadgeProps) {
	const status = getUserStatus(user);
	const config = statusConfig[status];

	return (
		<Badge variant="outline" className={cn(config.className, className)}>
			{config.label}
		</Badge>
	);
}
