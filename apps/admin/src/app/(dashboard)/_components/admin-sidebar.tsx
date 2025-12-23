"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@docix/ui/components/sidebar";
import {
	Analytics01Icon,
	ArrowLeft01Icon,
	BookOpen01Icon,
	Settings01Icon,
	Tag01Icon,
	UserGroupIcon,
	UserSettingsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/user-button";
import { useSession } from "@/hooks/use-session";

const navItems = [
	{
		label: "Overview",
		href: "/",
		icon: Analytics01Icon,
	},
	{
		label: "Users",
		href: "/users",
		icon: UserGroupIcon,
	},
	{
		label: "Roles",
		href: "/roles",
		icon: UserSettingsIcon,
	},
	{
		label: "Series",
		href: "/series",
		icon: BookOpen01Icon,
	},
	{
		label: "Tags",
		href: "/tags",
		icon: Tag01Icon,
	},
	{
		label: "Settings",
		href: "/settings",
		icon: Settings01Icon,
	},
];

export function AdminSidebar() {
	const pathname = usePathname();
	const { data } = useSession();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-b border-sidebar-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg">
							<Link href="/" className="flex items-center gap-2">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<span className="text-sm font-bold">D</span>
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">Docix</span>
									<span className="truncate text-xs text-muted-foreground">
										Admin Panel
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => {
								const isActive =
									pathname === item.href ||
									(item.href !== "/" && pathname.startsWith(item.href));
								return (
									<Link href={item.href} key={item.href}>
										<SidebarMenuItem>
											<SidebarMenuButton
												isActive={isActive}
												tooltip={item.label}
												className="flex items-center gap-2"
											>
												<HugeiconsIcon
													icon={item.icon}
													className="size-4 shrink-0"
												/>
												<span>{item.label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									</Link>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<Link
							className="flex items-center gap-2"
							href={
								process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000"
							}
						>
							<SidebarMenuButton tooltip="Back to Website">
								<HugeiconsIcon
									icon={ArrowLeft01Icon}
									className="size-4 shrink-0"
								/>
								<span className="group-data-[collapsible=icon]:hidden">
									Back to Website
								</span>
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" tooltip={data?.user.username}>
							<Link href="/account" className="flex items-center gap-2">
								<UserAvatar className="size-8" />
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{data?.user.username}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{data?.user.email}
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
