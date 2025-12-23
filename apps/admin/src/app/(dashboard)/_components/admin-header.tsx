"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@docix/ui/components/breadcrumb";
import { Separator } from "@docix/ui/components/separator";
import { SidebarTrigger } from "@docix/ui/components/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { ModeToggle } from "@/components/mode-toggle";

function generateBreadcrumbs(pathname: string) {
	const segments = pathname.split("/").filter(Boolean);
	const breadcrumbs: { label: string; href: string; isLast: boolean }[] = [];

	// Segments that are route groupings without their own page
	const skipSegments = ["chapters", "edit", "new"];

	let currentPath = "";
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (!segment) continue;

		currentPath += `/${segment}`;
		const isLast = i === segments.length - 1;

		// Skip intermediate route segments that don't have their own page
		// But still include them if they're the last segment (the actual page)
		if (!isLast && skipSegments.includes(segment)) {
			continue;
		}

		// Format label: capitalize and replace hyphens with spaces
		let label: string;

		// Handle dynamic segments (e.g., UUIDs or IDs)
		if (/^[a-f0-9-]{20,}$/i.test(segment)) {
			// Check context: if previous segment was "chapters", this is a chapter ID
			const prevSegment = segments[i - 1];
			if (prevSegment === "chapters") {
				label = "Chapter";
			} else {
				label = "Details";
			}
		} else if (segment === "new") {
			label = "New";
		} else if (segment === "edit") {
			label = "Edit";
		} else {
			label = segment
				.replace(/-/g, " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());
		}

		breadcrumbs.push({
			label,
			href: currentPath,
			isLast,
		});
	}

	return breadcrumbs;
}

export function AdminHeader() {
	const pathname = usePathname();
	const breadcrumbs = generateBreadcrumbs(pathname);

	return (
		<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-full" />
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						{breadcrumbs.length === 0 ? (
							<BreadcrumbPage>Dashboard</BreadcrumbPage>
						) : (
							<BreadcrumbLink render={<Link href="/" />}>
								Dashboard
							</BreadcrumbLink>
						)}
					</BreadcrumbItem>
					{breadcrumbs.map((crumb) => (
						<React.Fragment key={crumb.href}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{crumb.isLast ? (
									<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink render={<Link href={crumb.href} />}>
										{crumb.label}
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</React.Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
			<div className="ml-auto">
				<ModeToggle />
			</div>
		</header>
	);
}
