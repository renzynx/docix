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
	Logout01Icon,
	UserSettingsFreeIcons,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useSession } from "@/hooks/use-session";

export function UserAvatar(props: ComponentProps<typeof Avatar>) {
	const { data } = useSession();

	return (
		<Avatar {...props}>
			<AvatarImage
				src={data?.user.avatar || undefined}
				alt={data?.user.username?.charAt(0).toUpperCase()}
			/>
			<AvatarFallback className="bg-input/30 hover:bg-input/50">
				{data?.user.username?.charAt(0).toUpperCase() ||
					data?.user.email.charAt(0).toUpperCase()}
			</AvatarFallback>
		</Avatar>
	);
}

export default function UserButton() {
	const { data, isPending } = useSession();

	return isPending ? (
		<Skeleton className="rounded-full size-9" />
	) : !data?.user ? (
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
	) : (
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
							<span className="font-bold text-foreground">
								{data?.user.username}
							</span>
							<span className="text-xs text-muted-foreground truncate">
								{data?.user.email}
							</span>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						nativeButton={false}
						render={
							<Link href="/account">
								<HugeiconsIcon icon={UserSettingsFreeIcons} />
								<span>Account Settings</span>
							</Link>
						}
					/>
					<DropdownMenuItem>
						<HugeiconsIcon icon={Book01Icon} />
						Browse
					</DropdownMenuItem>
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
