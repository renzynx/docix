"use client";

import { SidebarInset, SidebarProvider } from "@docix/ui/components/sidebar";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AdminSidebar />
			<SidebarInset>
				<AdminHeader />
				<div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
