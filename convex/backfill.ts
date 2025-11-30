import { mutation } from "./_generated/server";
import {
  seriesAggregate,
  usersAggregate,
  chaptersAggregate,
  chaptersBySeries,
  pagesAggregate,
  favoritesAggregate,
  genresAggregate,
  notificationsAggregate,
} from "./aggregates";

export const backfillAllAggregates = mutation({
  args: {},
  handler: async (ctx) => {
    const counts = {
      series: 0,
      users: 0,
      chapters: 0,
      pages: 0,
      favorites: 0,
      genres: 0,
      notifications: 0,
    };

    const allSeries = await ctx.db.query("series").collect();
    for (const series of allSeries) {
      await seriesAggregate.insertIfDoesNotExist(ctx, series);
      counts.series++;
    }

    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      await usersAggregate.insertIfDoesNotExist(ctx, user);
      counts.users++;
    }

    const allChapters = await ctx.db.query("chapters").collect();
    for (const chapter of allChapters) {
      await chaptersAggregate.insertIfDoesNotExist(ctx, chapter);
      await chaptersBySeries.insertIfDoesNotExist(ctx, chapter);
      counts.chapters++;
    }

    const allPages = await ctx.db.query("pages").collect();
    for (const page of allPages) {
      await pagesAggregate.insertIfDoesNotExist(ctx, page);
      counts.pages++;
    }

    const allFavorites = await ctx.db.query("favorites").collect();
    for (const fav of allFavorites) {
      await favoritesAggregate.insertIfDoesNotExist(ctx, fav);
      counts.favorites++;
    }

    const allGenres = await ctx.db.query("genres").collect();
    for (const genre of allGenres) {
      await genresAggregate.insertIfDoesNotExist(ctx, genre);
      counts.genres++;
    }

    const allNotifications = await ctx.db.query("notifications").collect();
    for (const notif of allNotifications) {
      await notificationsAggregate.insertIfDoesNotExist(ctx, notif);
      counts.notifications++;
    }

    return counts;
  },
});
