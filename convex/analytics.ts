import { query } from "./_generated/server";
import {
  seriesAggregate,
  usersAggregate,
  chaptersAggregate,
  pagesAggregate,
  favoritesAggregate,
  genresAggregate,
  notificationsAggregate,
} from "./aggregates";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getAllAnalytics = query({
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    // Helper to get Total + Growth
    const getStats = async (agg: any) => {
      const [total, recent] = await Promise.all([
        agg.count(ctx),
        agg.count(ctx, {
          bounds: { lower: { key: thirtyDaysAgo, inclusive: true } },
        }),
      ]);
      return { total, growth: recent };
    };

    const [series, users, chapters, pages, favorites, genres, notifications] =
      await Promise.all([
        getStats(seriesAggregate),
        getStats(usersAggregate),
        getStats(chaptersAggregate),
        getStats(pagesAggregate),
        getStats(favoritesAggregate),
        getStats(genresAggregate),
        getStats(notificationsAggregate),
      ]);

    return {
      series,
      users,
      chapters,
      pages,
      favorites,
      genres,
      notifications,
      // Derived
      averageChaptersPerSeries:
        series.total > 0 ? chapters.total / series.total : 0,
      averagePagesPerChapter:
        chapters.total > 0 ? pages.total / chapters.total : 0,
      averageFavoritesPerSeries:
        series.total > 0 ? favorites.total / series.total : 0,
    };
  },
});

export const getAnalyticsSummary = query({
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    // Helper
    const getStats = async (agg: any) => {
      const [total, recent] = await Promise.all([
        agg.count(ctx),
        agg.count(ctx, {
          bounds: { lower: { key: thirtyDaysAgo, inclusive: true } },
        }),
      ]);
      return { total, growth: recent };
    };

    const [series, users, chapters, pages, favorites, notifications, genres] =
      await Promise.all([
        getStats(seriesAggregate),
        getStats(usersAggregate),
        getStats(chaptersAggregate),
        getStats(pagesAggregate),
        getStats(favoritesAggregate),
        getStats(notificationsAggregate),
        getStats(genresAggregate),
      ]);

    return {
      overview: {
        totalSeries: series.total,
        seriesGrowth: series.growth,
        totalUsers: users.total,
        usersGrowth: users.growth,
        totalChapters: chapters.total,
        chaptersGrowth: chapters.growth,
        totalPages: pages.total,
        pagesGrowth: pages.growth,
      },
      engagement: {
        totalFavorites: favorites.total,
        favoritesGrowth: favorites.growth,
        totalNotifications: notifications.total,
        averageFavoritesPerSeries:
          series.total > 0 ? favorites.total / series.total : 0,
      },
      content: {
        totalGenres: genres.total,
        averageChaptersPerSeries:
          series.total > 0 ? chapters.total / series.total : 0,
        averagePagesPerChapter:
          chapters.total > 0 ? pages.total / chapters.total : 0,
      },
    };
  },
});

export const getTotalUsers = query({
  handler: async (ctx) => await usersAggregate.count(ctx),
});
export const getTotalChapters = query({
  handler: async (ctx) => await chaptersAggregate.count(ctx),
});
export const getTotalPages = query({
  handler: async (ctx) => await pagesAggregate.count(ctx),
});
export const getTotalFavorites = query({
  handler: async (ctx) => await favoritesAggregate.count(ctx),
});
export const getTotalGenres = query({
  handler: async (ctx) => await genresAggregate.count(ctx),
});
export const getTotalNotifications = query({
  handler: async (ctx) => await notificationsAggregate.count(ctx),
});
