import type { Role } from "@docix/types";
import { Badge } from "@docix/ui/components/badge";
import { cn } from "@docix/ui/lib/utils";

interface RoleBadgeProps {
	role: Role;
	showSystem?: boolean;
	className?: string;
}

export function RoleBadge({
	role,
	showSystem = false,
	className,
}: RoleBadgeProps) {
	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			<Badge
				style={{
					backgroundColor: role.color ? `${role.color}20` : undefined,
					color: role.color || undefined,
					borderColor: role.color || undefined,
				}}
				variant="outline"
			>
				{role.display_name || role.name}
			</Badge>
			{showSystem && role.is_system && (
				<span className="text-xs text-muted-foreground">(System)</span>
			)}
		</span>
	);
}
