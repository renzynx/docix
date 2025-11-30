"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { Bell, BellRing, BookOpen, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function NotificationsTable({
  preloadedNotifications,
}: {
  preloadedNotifications: Preloaded<
    typeof api.notifications.getAllNotifications
  >;
}) {
  const notifications = usePreloadedQuery(preloadedNotifications);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleDelete = async (notificationId: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId });
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type: "new_chapter" | "series_update" | "system") => {
    switch (type) {
      case "new_chapter":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "series_update":
        return <BellRing className="h-5 w-5 text-yellow-500" />;
      case "system":
        return <Settings className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: "new_chapter" | "series_update" | "system") => {
    const colors = {
      new_chapter:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      series_update:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      system: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type]}`}>
        {type.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return !notifications || notifications.length === 0 ? (
    <div className="py-12 text-center text-muted-foreground">
      No notifications found
    </div>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Series</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="w-[70px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map((notification) => (
          <TableRow key={notification._id}>
            <TableCell>
              <div className="flex items-center justify-center">
                {getIcon(notification.type)}
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium">{notification.title}</div>
                <div>{getTypeBadge(notification.type)}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-xs truncate text-muted-foreground">
                {notification.message}
              </div>
            </TableCell>
            <TableCell>
              {notification.user ? (
                <span className="font-medium">{notification.user._id}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              {notification.series ? (
                <span className="text-sm">{notification.series.title}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  notification.isRead
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                }`}
              >
                {notification.isRead ? "Read" : "Unread"}
              </span>
            </TableCell>
            <TableCell>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(notification._creationTime)}
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleDelete(notification._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
