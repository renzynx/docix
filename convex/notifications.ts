import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isAuth, isAdmin } from "./helpers";

export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await isAuth(ctx);
    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Enrich with series data if available
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let series = null;
        if (notification.seriesId) {
          series = await ctx.db.get(notification.seriesId);
        }
        return {
          ...notification,
          series,
        };
      })
    );

    return enrichedNotifications;
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  handler: async (ctx) => {
    try {
      const user = await isAuth(ctx);

      const unreadNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_and_read", (q) =>
          q.eq("userId", user._id).eq("isRead", false)
        )
        .collect();

      return unreadNotifications.length;
    } catch {
      return 0;
    }
  },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await isAuth(ctx);

    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
  },
});

export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const user = await isAuth(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );

    return { markedCount: unreadNotifications.length };
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    await isAdmin(ctx);

    const user = await isAuth(ctx);

    if (notification.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.notificationId);
  },
});

export const getAllNotifications = query({
  handler: async (ctx) => {
    await isAdmin(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .order("desc")
      .take(100);

    // Enrich with user and series data
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let user = null;
        let series = null;

        if (notification.userId) {
          user = await ctx.db.get(notification.userId);
        }

        if (notification.seriesId) {
          series = await ctx.db.get(notification.seriesId);
        }

        return {
          ...notification,
          user,
          series,
        };
      })
    );

    return enrichedNotifications;
  },
});

export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("new_chapter"),
      v.literal("series_update"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    seriesId: v.optional(v.id("series")),
    chapterId: v.optional(v.id("chapters")),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      seriesId: args.seriesId,
      chapterId: args.chapterId,
      link: args.link,
      isRead: false,
    });

    return notificationId;
  },
});
