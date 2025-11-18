"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

export function AdminBreadcrumb() {
  const pathname = usePathname();

  // Split path and remove empty strings
  const pathSegments = pathname.split("/").filter(Boolean);

  // Remove 'admin' if it's the first segment
  if (pathSegments[0] === "admin") {
    pathSegments.shift();
  }

  // Build breadcrumb items
  const breadcrumbs: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
  }> = [{ label: "", href: "/admin", icon: <Home className="h-4 w-4" /> }];

  let currentPath = "/admin";

  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip IDs (segments that look like database IDs)
    if (segment.match(/^[a-z0-9]{20,}$/i)) {
      return;
    }

    // Format the label
    let label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Special cases
    if (segment === "new") label = "New";
    if (segment === "edit") label = "Edit";

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  });

  return (
    <div className="overflow-x-auto">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={index} className="contents">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-2">
                      {crumb.icon}
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={crumb.href}
                        className="flex items-center gap-2"
                      >
                        {crumb.icon}
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
