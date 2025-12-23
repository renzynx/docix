"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import { cn } from "@docix/ui/lib/utils";
import { ComputerIcon, MoonIcon, SunIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

const themes = [
	{
		value: "light",
		label: "Light",
		icon: SunIcon,
		description: "Light mode",
	},
	{
		value: "dark",
		label: "Dark",
		icon: MoonIcon,
		description: "Dark mode",
	},
	{
		value: "system",
		label: "System",
		icon: ComputerIcon,
		description: "Follow system preference",
	},
] as const;

export default function AppearancePage() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>
						Customize how Docix looks on your device.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-3">
						{themes.map((t) => (
							<button
								key={t.value}
								type="button"
								onClick={() => setTheme(t.value)}
								className={cn(
									"flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-6 transition-colors hover:bg-muted",
									theme === t.value && "border-primary bg-primary/5",
								)}
							>
								<HugeiconsIcon icon={t.icon} className="size-8" />
								<span className="font-medium">{t.label}</span>
								<span className="text-xs text-muted-foreground">
									{t.description}
								</span>
							</button>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
