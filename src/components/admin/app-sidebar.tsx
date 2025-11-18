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
  Home,
  Bell,
  BookOpen,
  Plus,
  ChevronRight,
  List,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AppSidebar() {
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);

  return (
    <Sidebar variant="inset" className="border-r">
      <SidebarHeader>
        <div className="p-4">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSeriesOpen(!seriesOpen)}
                  className="cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Manage Series</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      seriesOpen ? "rotate-90" : ""
                    }`}
                  />
                </SidebarMenuButton>
                {seriesOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/series/new">
                          <Plus className="h-4 w-4" />
                          <span>New Series</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/series">
                          <BookOpen className="h-4 w-4" />
                          <span>All Series</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      notificationsOpen ? "rotate-90" : ""
                    }`}
                  />
                </SidebarMenuButton>
                {notificationsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/notifications/new">
                          <Plus className="h-4 w-4" />
                          <span>New Notification</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/notifications">
                          <List className="h-4 w-4" />
                          <span>All Notifications</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setGenresOpen(!genresOpen)}
                  className="cursor-pointer"
                >
                  <Tag className="h-4 w-4" />
                  <span>Genres</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      genresOpen ? "rotate-90" : ""
                    }`}
                  />
                </SidebarMenuButton>
                {genresOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/genres/new">
                          <Plus className="h-4 w-4" />
                          <span>New Genre</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/genres">
                          <List className="h-4 w-4" />
                          <span>All Genres</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
