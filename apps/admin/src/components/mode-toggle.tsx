"use client";

import { Button } from "@docix/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@docix/ui/components/dropdown-menu";
import {
	ComputerIcon,
	MoonIcon,
	PaintBoardIcon,
	SunIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="outline">
						<HugeiconsIcon icon={PaintBoardIcon} />
						<span className="sr-only">Toggle theme</span>
					</Button>
				}
			/>

			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
						<DropdownMenuRadioItem value="light">
							<HugeiconsIcon icon={SunIcon} strokeWidth={2} />
							Light
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="dark">
							<HugeiconsIcon icon={MoonIcon} strokeWidth={2} />
							Dark
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="system">
							<HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
							System
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
