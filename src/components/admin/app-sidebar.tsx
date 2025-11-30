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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Bell,
  BookOpen,
  Plus,
  ChevronRight,
  List,
  Tag,
  BarChart3,
  Settings,
  LibraryBig,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// Menu item type definitions
interface SubMenuItem {
  title: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  items?: SubMenuItem[];
  badge?: string;
}

// Menu configuration - easy to maintain and extend
const menuItems: MenuItem[] = [
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/admin",
  },
  {
    title: "Chapters",
    icon: FileText,
    href: "/admin/chapters",
  },
  {
    title: "Series",
    icon: BookOpen,
    items: [
      {
        title: "All Series",
        icon: LibraryBig,
        href: "/admin/series",
      },
      {
        title: "New Series",
        icon: Plus,
        href: "/admin/series/new",
      },
    ],
  },
  {
    title: "Genres",
    icon: Tag,
    items: [
      {
        title: "All Genres",
        icon: List,
        href: "/admin/genres",
      },
      {
        title: "New Genre",
        icon: Plus,
        href: "/admin/genres/new",
      },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: [
      {
        title: "All Notifications",
        icon: List,
        href: "/admin/notifications",
      },
      {
        title: "New Notification",
        icon: Plus,
        href: "/admin/notifications/new",
      },
    ],
  },
];

// Collapsible menu item component
function CollapsibleMenuItem({ item }: { item: MenuItem }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(() => {
    // Auto-open if current path matches any sub-item
    return item.items?.some((subItem) => pathname === subItem.href) || false;
  });

  if (!item.items) {
    // Simple menu item without sub-items
    const isActive = pathname === item.href;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={item.href!}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Collapsible menu item with sub-items
  const hasActiveChild = item.items.some(
    (subItem) => pathname === subItem.href
  );

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
        isActive={hasActiveChild}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
        {item.badge && (
          <Badge
            variant="secondary"
            className="ml-auto mr-2 h-5 px-1.5 text-xs"
          >
            {item.badge}
          </Badge>
        )}
        <ChevronRight
          className={`ml-auto h-4 w-4 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub>
          {item.items.map((subItem) => {
            const isActive = pathname === subItem.href;
            return (
              <SidebarMenuSubItem key={subItem.href}>
                <SidebarMenuSubButton asChild isActive={isActive}>
                  <Link href={subItem.href}>
                    <subItem.icon className="h-4 w-4" />
                    <span>{subItem.title}</span>
                    {subItem.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 px-1.5 text-xs"
                      >
                        {subItem.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar variant="inset" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Docix Admin</span>
            <span className="text-xs text-muted-foreground">
              Content Management
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <CollapsibleMenuItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <Link href="/admin/series/new">
                    <Plus className="h-4 w-4" />
                    <span>Add Series</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <Link href="/admin/notifications/new">
                    <Bell className="h-4 w-4" />
                    <span>Send Notification</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
