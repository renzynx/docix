import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminHeader } from "@/components/admin/header";
import { AdminBreadcrumb } from "@/components/admin/dynamic-breadcrumb";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <AdminHeader />
        <div className="p-4 max-w-7xl mx-auto w-full min-h-[calc(100vh-4rem)]">
          <AdminBreadcrumb />
          <div className="mt-4">{children}</div>
        </div>
      </main>
    </SidebarProvider>
  );
}
