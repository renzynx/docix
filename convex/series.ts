import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateSlug, isAuth, isAdmin } from "./helpers";

export const getAllSeries = query({
  args: {
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let seriesQuery = ctx.db.query("series").order("desc");

    if (args.statusFilter) {
      seriesQuery = seriesQuery.filter((q) =>
        q.eq(q.field("status"), args.statusFilter)
      );
    }

    const results = await seriesQuery.collect();

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

        return {
          ...series,
          coverImageUrl: series.coverImageStorageId
            ? await ctx.storage.getUrl(series.coverImageStorageId)
            : null,
          genreNames: genreNames.filter(Boolean) as string[],
        };
      })
    );

    return patchedResults;
  },
});

export const searchSeries = query({
  args: {
    searchText: v.string(),
    statusFilter: v.optional(v.string()),
    genreFilter: v.optional(v.string()),
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

    const results = await query.take(20);

    const patchedResults = await Promise.all(
      results.map(async (series) => ({
        ...series,
        coverImageUrl: series.coverImageStorageId
          ? await ctx.storage.getUrl(series.coverImageStorageId)
          : null,
      }))
    );

    return patchedResults;
  },
});

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
    });

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

    // Update slug if title changed
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

    // Build searchableText if any searchable fields are being updated
    const searchableText = `${updates.title || series.title} ${
      updates.description !== undefined
        ? updates.description
        : series.description
    } ${updates.author !== undefined ? updates.author : series.author}`;

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
        // Delete page image from storage if exists
        if (page.storageId) {
          await ctx.storage.delete(page.storageId);
        }
        await ctx.db.delete(page._id);
      }

      await ctx.db.delete(chapter._id);
    }

    // Delete cover image from storage if exists
    if (series.coverImageStorageId) {
      await ctx.storage.delete(series.coverImageStorageId);
    }

    // Delete the series
    await ctx.db.delete(args.id);

    return { success: true };
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
    // This query requires an authenticated user
    const user = await isAuth(ctx);

    // 1. Get the join table entries (fast index query)
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // 2. Get the actual series documents (fast point-gets)
    const seriesList = await Promise.all(
      favorites.map((f) => ctx.db.get(f.seriesId))
    );

    // 3. Return the joined data (filter out any nulls if series was deleted)
    return seriesList.filter(Boolean);
  },
});

/**
 * Get favorite status for a single series (for UI)
 */
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
      // User is not logged in, so they can't have a favorite
      return false;
    }
  },
});

/**
 * Toggle Favorite Mutation
 */
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

/**
 * Get series by genre slug
 */
export const getSeriesByGenre = query({
  args: { genreSlug: v.string() },
  handler: async (ctx, args) => {
    // First, find the genre by slug
    const genre = await ctx.db
      .query("genres")
      .withIndex("by_slug", (q) => q.eq("slug", args.genreSlug))
      .unique();

    if (!genre) {
      return [];
    }

    // Get all series that include this genre ID
    const allSeries = await ctx.db.query("series").collect();

    const seriesWithGenre = allSeries.filter(
      (series) => series.genres && series.genres.includes(genre._id)
    );

    // Patch with cover images and genre names
    const patchedResults = await Promise.all(
      seriesWithGenre.map(async (series) => {
        const genreNames = series.genres
          ? await Promise.all(
              series.genres.map(async (genreId) => {
                const g = await ctx.db.get(genreId);
                return g?.name || null;
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
      })
    );

    return patchedResults;
  },
});
