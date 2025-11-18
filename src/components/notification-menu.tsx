"use client";

import { Bell, Check, X, BookOpen, BellRing, Settings } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { Id } from "@convex/_generated/dataModel";

export const NotificationMenu = () => {
  const notifications = useQuery(api.notifications.getUserNotifications, {
    limit: 10,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    await markAsRead({ notificationId });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    await deleteNotification({ notificationId });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "group relative rounded-lg p-3 hover:bg-accent transition-colors",
                    !notification.isRead && "bg-accent/50"
                  )}
                >
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="block"
                      onClick={() => handleMarkAsRead(notification._id)}
                    >
                      <NotificationContent notification={notification} />
                    </Link>
                  ) : (
                    <NotificationContent notification={notification} />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(notification._id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NotificationContent = ({
  notification,
}: {
  notification: {
    _id: Id<"notifications">;
    _creationTime: number;
    title: string;
    message: string;
    type: "new_chapter" | "series_update" | "system";
    isRead: boolean;
    series?: { title: string } | null;
  };
}) => {
  const getIcon = () => {
    switch (notification.type) {
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

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-medium leading-none">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          {notification.series && (
            <p className="text-xs text-muted-foreground">
              {notification.series.title}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(notification._creationTime)}
          </p>
        </div>
      </div>
    </div>
  );
};
