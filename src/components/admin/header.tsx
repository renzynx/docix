"use client";

import { UserButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading } from "convex/react";
import { Undo2 } from "lucide-react";
import { ModeToggle } from "../mode-toggle";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";

export const AdminHeader = () => {
  return (
    <nav>
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <SidebarTrigger />

        <div className="flex items-center gap-4">
          <ModeToggle />

          <AuthLoading>
            <Skeleton className="w-8 h-8 rounded-full" />
          </AuthLoading>
          <Authenticated>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Back to Website"
                  labelIcon={<Undo2 size={16} />}
                  href="/"
                />
              </UserButton.MenuItems>
            </UserButton>
          </Authenticated>
        </div>
      </div>
    </nav>
  );
};
