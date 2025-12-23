"use client";

import { Separator } from "@docix/ui/components/separator";
import { cn } from "@docix/ui/lib/utils";
import {
	CreditCardIcon,
	Notification02Icon,
	PaintBoardIcon,
	SecurityLockIcon,
	UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{
		label: "Profile",
		href: "/account",
		icon: UserCircle02Icon,
	},
	{
		label: "Security",
		href: "/account/security",
		icon: SecurityLockIcon,
	},
	{
		label: "Appearance",
		href: "/account/appearance",
		icon: PaintBoardIcon,
	},
	{
		label: "Billing",
		href: "/account/billing",
		icon: CreditCardIcon,
	},
	{
		label: "Notifications",
		href: "/account/notifications",
		icon: Notification02Icon,
	},
];

function NavLinks({ className }: { className?: string }) {
	const pathname = usePathname();

	return (
		<nav className={className}>
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<HugeiconsIcon icon={item.icon} className="size-5 shrink-0" />
						<span>{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}

export function AccountSidebar() {
	return (
		<>
			{/* Mobile */}
			<aside className="lg:hidden mb-6 mx-auto">
				<h2 className="mb-3 text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
					Settings
				</h2>
				<Separator className="mb-4" />
				<NavLinks className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" />
			</aside>

			{/* Desktop */}
			<aside className="hidden lg:flex flex-col w-60 shrink-0 border-r pr-6">
				<h2 className="px-3 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Settings
				</h2>
				<NavLinks className="flex flex-col gap-1" />
			</aside>
		</>
	);
}
