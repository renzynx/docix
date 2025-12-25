"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@docix/ui/components/avatar";
import { Button } from "@docix/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@docix/ui/components/dropdown-menu";
import { Skeleton } from "@docix/ui/components/skeleton";
import {
	Book01Icon,
	Bookmark01Icon,
	DashboardSquare02Icon,
	Logout01Icon,
	UserSettingsFreeIcons,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useIsAdmin } from "@/hooks/use-permissions";
import { useSession } from "@/hooks/use-session";

export function UserAvatar(props: ComponentProps<typeof Avatar>) {
	const { data } = useSession();
	const user = data?.user;

	return (
		<Avatar {...props}>
			<AvatarImage
				src={user?.avatar || undefined}
				alt={user?.username?.charAt(0).toUpperCase()}
			/>
			<AvatarFallback className="bg-input/30 hover:bg-input/50">
				{user?.username?.charAt(0).toUpperCase() ||
					user?.email?.charAt(0).toUpperCase() ||
					"G"}
			</AvatarFallback>
		</Avatar>
	);
}

export default function UserButton() {
	const { data, isPending } = useSession();
	const { isAdmin } = useIsAdmin();

	const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
	const isGuest = data?.is_guest ?? true;
	const user = data?.user;

	if (isPending) {
		return <Skeleton className="rounded-full size-9" />;
	}

	if (isGuest || !user) {
		return (
			<div className="space-x-4">
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href="/auth/sign-in">Sign In</Link>}
				/>
				<Button
					nativeButton={false}
					render={<Link href="/auth/sign-up">Sign Up</Link>}
				/>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				nativeButton={false}
				render={<UserAvatar className="cursor-pointer size-9" />}
			/>
			<DropdownMenuContent className="w-56" align="end" sideOffset={8}>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex gap-4 items-center">
						<UserAvatar />

						<div className="flex flex-col">
							<span className="font-bold text-foreground">{user.username}</span>
							<span className="text-xs text-muted-foreground truncate">
								{user.email}
							</span>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					{isAdmin && (
						<DropdownMenuItem
							nativeButton={false}
							render={
								<a href={adminUrl}>
									<HugeiconsIcon icon={DashboardSquare02Icon} />
									<span>Admin Dashboard</span>
								</a>
							}
						/>
					)}

					<DropdownMenuItem
						nativeButton={false}
						render={
							<Link href="/account">
								<HugeiconsIcon icon={UserSettingsFreeIcons} />
								<span>Account Settings</span>
							</Link>
						}
					/>
					<DropdownMenuItem
						nativeButton={false}
						render={
							<Link href="/library">
								<HugeiconsIcon icon={Bookmark01Icon} />
								<span>My Library</span>
							</Link>
						}
					/>

					<DropdownMenuItem
						nativeButton={false}
						render={
							<Link href="/browse">
								<HugeiconsIcon icon={Book01Icon} />
								<span>Browse</span>
							</Link>
						}
					/>
					<DropdownMenuItem
						className="text-destructive"
						render={
							<Link href="/auth/sign-out">
								<HugeiconsIcon icon={Logout01Icon} />
								<span>Sign Out</span>
							</Link>
						}
					/>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
