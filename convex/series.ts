import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateSlug, isAuth, isAdmin } from "./helpers";
import { counter } from "./counter"; // Keep for View Counts (ShardedCounter)
import { paginationOptsValidator } from "convex/server";
import { seriesAggregate, chaptersBySeries } from "./aggregates"; // Import Aggregates
import { Id, Doc } from "./_generated/dataModel";

// --- QUERIES ---

export const getAllSeries = query({
  args: {
    statusFilter: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let seriesQuery = ctx.db.query("series").order(args.sortOrder || "desc");

    if (args.statusFilter) {
      seriesQuery = seriesQuery.filter((q) =>
        q.eq(q.field("status"), args.statusFilter)
      );
    }

    // Determine count based on filter presence to optimize
    let totalCount;
    if (!args.statusFilter) {
      totalCount = await seriesAggregate.count(ctx);
    } else {
      totalCount = 0;
    }

    const results = await seriesQuery.paginate(args.paginationOpts);

    const patchedPage = await Promise.all(
      results.page.map(async (series) => {
        const genreNames = series.genres
          ? await Promise.all(
              series.genres.map(async (genreId) => {
                const genre = await ctx.db.get(genreId);
                return genre?.name || null;
              })
            )
          : [];

        const latestChapter = await ctx.db
          .query("chapters")
          .withIndex("by_series_id", (q) => q.eq("seriesId", series._id))
          .order("desc")
          .first();

        const coverImageUrl = series.coverImageStorageId
          ? await ctx.storage.getUrl(series.coverImageStorageId)
          : null;

        return {
          ...series,
          coverImageUrl,
          genreNames: genreNames.filter(Boolean) as string[],
          latestChapter,
        };
      })
    );

    return {
      ...results,
      page: patchedPage,
      totalCount: totalCount || results.page.length, // Fallback
    };
  },
});

export const searchSeries = query({
  args: {
    searchText: v.string(),
    statusFilter: v.optional(v.string()),
    genreFilter: v.optional(v.string()), // Kept for backward compatibility if needed
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("series")
      .withSearchIndex("search_series", (q) =>
        q.search("searchableText", args.searchText)
      );

    if (args.statusFilter) {
      query = query.filter((q) => q.eq(q.field("status"), args.statusFilter));
    }

    const results = await query.take(50); // Increased limit for search results

    const patchedResults = await Promise.all(
      results.map(async (series) => {
        const genreNames = series.genres
          ? await Promise.all(
              series.genres.map(async (genreId) => {
                const genre = await ctx.db.get(genreId);
                return genre?.name || null;
              })
            )
          : [];

        // Note: Latest chapter fetch omitted in search for speed, or can be added back if critical
        const latestChapter = await ctx.db
          .query("chapters")
          .withIndex("by_series_id", (q) => q.eq("seriesId", series._id))
          .order("desc")
          .first();

        return {
          ...series,
          coverImageUrl: series.coverImageStorageId
            ? await ctx.storage.getUrl(series.coverImageStorageId)
            : null,
          genreNames: genreNames.filter(Boolean) as string[],
          latestChapter,
        };
      })
    );

    return patchedResults;
  },
});

export const getSeriesByGenre = query({
  args: {
    genreSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const genre = await ctx.db
      .query("genres")
      .withIndex("by_slug", (q) => q.eq("slug", args.genreSlug))
      .unique();

    if (!genre) return [];

    const genreId = genre._id;

    const filteredSeries = await ctx.db
      .query("series")
      .withIndex("by_genres", (q) => q.eq("genres", [genreId]))
      .collect();

    const patchedResults = await Promise.all(
      filteredSeries.map(async (series) => {
        const currentGenres = series.genres || [];

        const genreNames = await Promise.all(
          currentGenres.map(async (gId) => {
            const g = await ctx.db.get(gId);
            return g?.name || null;
          })
        );

        const latestChapter = await ctx.db
          .query("chapters")
          .withIndex("by_series_id", (q) => q.eq("seriesId", series._id))
          .order("desc")
          .first();

        return {
          ...series,
          coverImageUrl: series.coverImageStorageId
            ? await ctx.storage.getUrl(series.coverImageStorageId)
            : null,
          genreNames: genreNames.filter(Boolean) as string[],
          latestChapter,
        };
      })
    );

    return patchedResults;
  },
});

export const getSeriesById = query({
  args: { id: v.id("series") },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.id);

    if (!series) {
      return null;
    }

    return {
      ...series,
      coverImageUrl: series.coverImageStorageId
        ? await ctx.storage.getUrl(series.coverImageStorageId)
        : null,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!series) return null;

    const genreNames = series.genres
      ? await Promise.all(
          series.genres.map(async (genreId) => {
            const genre = await ctx.db.get(genreId);
            return genre?.name || null;
          })
        )
      : [];

    return {
      ...series,
      coverImageUrl: series.coverImageStorageId
        ? await ctx.storage.getUrl(series.coverImageStorageId)
        : null,
      genreNames: genreNames.filter(Boolean) as string[],
    };
  },
});

export const getWithChapters = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!series) return null;

    // Use Aggregate for efficient CHAPTER count (Namespace = seriesId)
    const totalChapters = await chaptersBySeries.count(ctx, {
      namespace: series._id,
    });

    const firstChapter = await ctx.db
      .query("chapters")
      .withIndex("by_series_id", (q) => q.eq("seriesId", series._id))
      .order("asc")
      .first();

    const genreNames = series.genres
      ? await Promise.all(
          series.genres.map(async (genreId) => {
            const genre = await ctx.db.get(genreId);
            return genre?.name || null;
          })
        )
      : [];

    return {
      ...series,
      coverImageUrl: series.coverImageStorageId
        ? await ctx.storage.getUrl(series.coverImageStorageId)
        : null,
      genreNames: genreNames.filter(Boolean) as string[],
      totalChapters, // This uses the aggregate count
      firstChapter,
    };
  },
});

export const getPaginatedChapters = query({
  args: {
    seriesId: v.id("series"),
    paginationOpts: paginationOptsValidator,
    order: v.union(v.literal("asc"), v.literal("desc")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapters")
      .withIndex("by_series_id", (q) => q.eq("seriesId", args.seriesId))
      .order(args.order)
      .paginate(args.paginationOpts);
  },
});

export const getWithChaptersById = query({
  args: { id: v.id("series") },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.id);

    if (!series) return null;

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_series_id", (q) => q.eq("seriesId", series._id))
      .order("desc")
      .collect();

    // Get page counts for each chapter
    const chaptersWithPageCount = await Promise.all(
      chapters.map(async (chapter) => {
        const pages = await ctx.db
          .query("pages")
          .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
          .collect();
        return {
          ...chapter,
          pageCount: pages.length,
        };
      })
    );

    // Get genre names
    const genreNames = series.genres
      ? await Promise.all(
          series.genres.map(async (genreId) => {
            const genre = await ctx.db.get(genreId);
            return genre?.name || null;
          })
        )
      : [];

    return {
      ...series,
      coverImageUrl: series.coverImageStorageId
        ? await ctx.storage.getUrl(series.coverImageStorageId)
        : null,
      genreNames: genreNames.filter(Boolean) as string[],
      chapters: chaptersWithPageCount,
    };
  },
});

export const getFavorites = query({
  handler: async (ctx) => {
    const user = await isAuth(ctx);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const seriesList = await Promise.all(
      favorites.map((f) => ctx.db.get(f.seriesId))
    );

    return seriesList.filter(Boolean);
  },
});

export const getIsFavorited = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    try {
      const user = await isAuth(ctx);

      const existingFavorite = await ctx.db
        .query("favorites")
        .withIndex("by_user_and_series", (q) =>
          q.eq("userId", user._id).eq("seriesId", args.seriesId)
        )
        .unique();

      return existingFavorite !== null;
    } catch {
      return false;
    }
  },
});

export const getLatestSeries = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const latestSeries = await ctx.db
      .query("series")
      .withIndex("by_updated_at")
      .order("desc")
      .take(limit);

    const patchedSeries = await Promise.all(
      latestSeries.map(async (item) => {
        // Get Genre Names
        const genreNames = item.genres
          ? await Promise.all(
              item.genres.map(async (genreId) => {
                const genre = await ctx.db.get(genreId);
                return genre?.name || null;
              })
            )
          : [];

        const latestChapter = await ctx.db
          .query("chapters")
          .withIndex("by_series_id", (q) => q.eq("seriesId", item._id))
          .order("desc")
          .first();

        return {
          ...item,
          coverImageUrl: item.coverImageStorageId
            ? await ctx.storage.getUrl(item.coverImageStorageId)
            : null,
          genreNames: genreNames.filter((name) => name !== null),
          latestChapter,
        };
      })
    );

    return patchedSeries;
  },
});

export const getTotalSeriesCount = query({
  args: {},
  handler: async (ctx) => {
    return await seriesAggregate.count(ctx);
  },
});

export const getSeriesViewCount = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    return await counter.count(ctx, args.seriesId);
  },
});

// --- MUTATIONS ---

export const createSeries = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    status: v.union(
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("hiatus"),
      v.literal("cancelled")
    ),
    genres: v.optional(v.array(v.id("genres"))),
    coverImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    let slug = generateSlug(args.title);

    const existing = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      slug = `${slug}-${randomSuffix}`;
    }

    const newSeriesId = await ctx.db.insert("series", {
      title: args.title,
      slug,
      description: args.description,
      author: args.author,
      status: args.status,
      genres: args.genres,
      coverImageStorageId: args.coverImageStorageId,
      searchableText: `${args.title} ${args.description} ${args.author}`,
      updatedAt: Date.now(),
      viewCount: 0,
    });

    // Update Series Aggregate
    const newSeries = await ctx.db.get(newSeriesId);
    if (newSeries) {
      await seriesAggregate.insert(ctx, newSeries);
    }

    return newSeriesId;
  },
});

export const updateSeries = mutation({
  args: {
    id: v.id("series"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("hiatus"),
        v.literal("cancelled")
      )
    ),
    genres: v.optional(v.array(v.id("genres"))),
    coverImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const { id, ...updates } = args;
    const series = await ctx.db.get(id);

    if (!series) {
      throw new Error("Series not found");
    }

    let slug = series.slug;
    if (updates.title && updates.title !== series.title) {
      slug = generateSlug(updates.title);

      const existing = await ctx.db
        .query("series")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();

      if (existing && existing._id !== id) {
        const randomSuffix = Math.floor(Math.random() * 10000);
        slug = `${slug}-${randomSuffix}`;
      }
    }

    const searchableText = `${updates.title || series.title} ${
      updates.description !== undefined
        ? updates.description
        : series.description
    } ${updates.author !== undefined ? updates.author : series.author}`;

    // Note: If you update genres, you may need to update aggregates depending on how they are indexed,
    // but standard TableAggregate handles inserts/deletes. Updates to non-sort keys are implicit.

    await ctx.db.patch(id, {
      ...updates,
      slug,
      searchableText,
    });

    return id;
  },
});

export const deleteSeries = mutation({
  args: { id: v.id("series") },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const series = await ctx.db.get(args.id);

    if (!series) {
      throw new Error("Series not found");
    }

    // Delete associated chapters
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_series_id", (q) => q.eq("seriesId", args.id))
      .collect();

    for (const chapter of chapters) {
      // Delete chapter pages
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
        .collect();

      for (const page of pages) {
        if (page.storageId) {
          await ctx.storage.delete(page.storageId);
        }
        await ctx.db.delete(page._id);
        // Note: Ideally, delete from pagesAggregate here
      }

      await ctx.db.delete(chapter._id);

      // Remove from chaptersBySeries aggregate
      await chaptersBySeries.delete(ctx, chapter);
    }

    if (series.coverImageStorageId) {
      await ctx.storage.delete(series.coverImageStorageId);
    }

    await ctx.db.delete(args.id);

    // Update Series Aggregate
    await seriesAggregate.delete(ctx, series);

    // Reset View Count (Sharded Counter)
    await counter.reset(ctx, args.id);

    return { success: true };
  },
});

export const incrementSeriesView = mutation({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await counter.inc(ctx, args.seriesId);
    const viewCount = await counter.count(ctx, args.seriesId);
    await ctx.db.patch(args.seriesId, { viewCount });
    return { viewCount };
  },
});

export const toggleFavorite = mutation({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const user = await isAuth(ctx); // Auth Guard

    // Check if it already exists
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_series", (q) =>
        q.eq("userId", user._id).eq("seriesId", args.seriesId)
      )
      .unique();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);
      return { favorited: false };
    } else {
      await ctx.db.insert("favorites", {
        userId: user._id,
        seriesId: args.seriesId,
      });
      return { favorited: true };
    }
  },
});
