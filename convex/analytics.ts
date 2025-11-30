import { query } from "./_generated/server";
import { counter } from "./counter";

export const getAllAnalytics = query({
  handler: async (ctx) => {
    const [
      seriesCount,
      usersCount,
      chaptersCount,
      pagesCount,
      favoritesCount,
      genresCount,
      notificationsCount,
    ] = await Promise.all([
      counter.count(ctx, "series"),
      counter.count(ctx, "users"),
      counter.count(ctx, "chapters"),
      counter.count(ctx, "pages"),
      counter.count(ctx, "favorites"),
      counter.count(ctx, "genres"),
      counter.count(ctx, "notifications"),
    ]);

    return {
      series: seriesCount,
      users: usersCount,
      chapters: chaptersCount,
      pages: pagesCount,
      favorites: favoritesCount,
      genres: genresCount,
      notifications: notificationsCount,
      // Calculate some derived metrics
      averageChaptersPerSeries:
        seriesCount > 0 ? chaptersCount / seriesCount : 0,
      averagePagesPerChapter:
        chaptersCount > 0 ? pagesCount / chaptersCount : 0,
      averageFavoritesPerSeries:
        seriesCount > 0 ? favoritesCount / seriesCount : 0,
    };
  },
});

/**
 * Individual counter queries for specific metrics
 */

export const getTotalUsers = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "users");
  },
});

export const getTotalChapters = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "chapters");
  },
});

export const getTotalPages = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "pages");
  },
});

export const getTotalFavorites = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "favorites");
  },
});

export const getTotalGenres = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "genres");
  },
});

export const getTotalNotifications = query({
  handler: async (ctx) => {
    return await counter.count(ctx, "notifications");
  },
});

/**
 * Get analytics summary with growth metrics
 */
export const getAnalyticsSummary = query({
  handler: async (ctx) => {
    const [
      seriesCount,
      usersCount,
      chaptersCount,
      pagesCount,
      favoritesCount,
      notificationsCount,
      genresCount,
    ] = await Promise.all([
      counter.count(ctx, "series"),
      counter.count(ctx, "users"),
      counter.count(ctx, "chapters"),
      counter.count(ctx, "pages"),
      counter.count(ctx, "favorites"),
      counter.count(ctx, "notifications"),
      counter.count(ctx, "genres"),
    ]);

    // Calculate derived metrics
    const averageChaptersPerSeries =
      seriesCount > 0 ? chaptersCount / seriesCount : 0;
    const averagePagesPerChapter =
      chaptersCount > 0 ? pagesCount / chaptersCount : 0;
    const averageFavoritesPerSeries =
      seriesCount > 0 ? favoritesCount / seriesCount : 0;

    return {
      overview: {
        totalSeries: seriesCount,
        totalUsers: usersCount,
        totalChapters: chaptersCount,
        totalPages: pagesCount,
      },
      engagement: {
        totalFavorites: favoritesCount,
        totalNotifications: notificationsCount,
        averageFavoritesPerSeries,
      },
      content: {
        totalGenres: genresCount,
        averageChaptersPerSeries,
        averagePagesPerChapter,
      },
    };
  },
});
