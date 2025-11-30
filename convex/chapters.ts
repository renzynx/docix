import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isAuth, isAdmin } from "./helpers";
import { counter } from "./counter";

export const getAllChapters = query({
  args: {
    seriesId: v.id("series"),
  },
  handler: async (ctx, args) => {
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_series_id", (q) => q.eq("seriesId", args.seriesId))
      .order("desc")
      .collect();

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

    return chaptersWithPageCount;
  },
});

export const getChapterById = query({
  args: {
    id: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.id);
    if (!chapter) {
      return null;
    }

    // Get all pages for the chapter
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", args.id))
      .collect();

    // Sort pages by pageNumber
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const pagesWithUrls = await Promise.all(
      pages.map(async (page) => ({
        ...page,
        url: page.storageId ? await ctx.storage.getUrl(page.storageId) : null,
      }))
    );

    return {
      ...chapter,
      pages: pagesWithUrls,
    };
  },
});

export const getNextChapter = query({
  args: {
    seriesId: v.id("series"),
    currentChapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the chapter with the next highest number
    const nextChapter = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", args.seriesId)
      )
      .filter((q) => q.gt(q.field("chapterNumber"), args.currentChapterNumber))
      .first();

    return nextChapter;
  },
});

export const getPreviousChapter = query({
  args: {
    seriesId: v.id("series"),
    currentChapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the chapter with the next lowest number
    // Since we can't easily sort in reverse with filter, we'll fetch all chapters
    // and find the one immediately preceding
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", args.seriesId)
      )
      .collect();

    // Sort by chapter number ascending
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    // Find the index of current chapter (or where it would be)
    // We want the chapter with largest number that is still less than current
    let prevChapter = null;
    for (const chapter of chapters) {
      if (chapter.chapterNumber < args.currentChapterNumber) {
        prevChapter = chapter;
      } else {
        break;
      }
    }

    return prevChapter;
  },
});

export const markChapterRead = mutation({
  args: {
    chapterId: v.id("chapters"),
    seriesId: v.id("series"),
    pageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await isAuth(ctx);
    if (!user) return; // Silent fail for non-logged in users

    const existingHistory = await ctx.db
      .query("readingHistory")
      .withIndex("by_user_and_chapter", (q) =>
        q.eq("userId", user._id).eq("chapterId", args.chapterId)
      )
      .unique();

    if (existingHistory) {
      // Update existing history
      if (existingHistory.lastViewedPage < args.pageNumber) {
        await ctx.db.patch(existingHistory._id, {
          lastViewedPage: args.pageNumber,
        });
      }
    } else {
      // Create new history
      await ctx.db.insert("readingHistory", {
        userId: user._id,
        chapterId: args.chapterId,
        seriesId: args.seriesId, // Denormalized for fast "continue" queries
        lastViewedPage: args.pageNumber,
      });
    }
  },
});

export const createChapter = mutation({
  args: {
    seriesId: v.id("series"),
    chapterNumber: v.number(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    // Check if chapter number already exists
    const existing = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", args.seriesId).eq("chapterNumber", args.chapterNumber)
      )
      .unique();

    if (existing) {
      throw new Error(`Chapter ${args.chapterNumber} already exists.`);
    }

    const chapterId = await ctx.db.insert("chapters", {
      seriesId: args.seriesId,
      chapterNumber: args.chapterNumber,
      title: args.title,
    });

    // Increment the chapters counter for analytics
    await counter.inc(ctx, "chapters");

    await ctx.db.patch(args.seriesId, { updatedAt: Date.now() });

    return chapterId;
  },
});

export const addPage = mutation({
  args: {
    chapterId: v.id("chapters"),
    pageNumber: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const pageId = await ctx.db.insert("pages", {
      chapterId: args.chapterId,
      pageNumber: args.pageNumber,
      storageId: args.storageId,
    });

    // Increment the pages counter for analytics
    await counter.inc(ctx, "pages");

    return pageId;
  },
});

export const updateChapter = mutation({
  args: {
    id: v.id("chapters"),
    chapterNumber: v.optional(v.number()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const chapter = await ctx.db.get(args.id);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // If changing chapter number, check if it already exists
    if (
      args.chapterNumber !== undefined &&
      args.chapterNumber !== chapter.chapterNumber
    ) {
      const existing = await ctx.db
        .query("chapters")
        .withIndex("by_series_id_and_number", (q) =>
          q
            .eq("seriesId", chapter.seriesId)
            .eq("chapterNumber", args.chapterNumber!)
        )
        .unique();

      if (existing && existing._id !== args.id) {
        throw new Error(`Chapter ${args.chapterNumber} already exists.`);
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.chapterNumber !== undefined && {
        chapterNumber: args.chapterNumber,
      }),
      ...(args.title !== undefined && { title: args.title }),
    });

    return { success: true };
  },
});

/**
 * Delete a page from a chapter
 */
export const deletePage = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const page = await ctx.db.get(args.id);
    if (!page) {
      throw new Error("Page not found");
    }

    // Delete storage file
    if (page.storageId) {
      await ctx.storage.delete(page.storageId);
    }

    // Delete the page
    await ctx.db.delete(args.id);

    // Decrement the pages counter for analytics
    await counter.dec(ctx, "pages");

    return { success: true };
  },
});

export const deleteChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const chapter = await ctx.db.get(args.id);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Delete all pages and their storage files
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", args.id))
      .collect();

    for (const page of pages) {
      if (page.storageId) {
        await ctx.storage.delete(page.storageId);
      }
      await ctx.db.delete(page._id);
    }

    // Decrement the pages counter for all deleted pages
    if (pages.length > 0) {
      await counter.subtract(ctx, "pages", pages.length);
    }

    // Delete the chapter
    await ctx.db.delete(args.id);

    // Decrement the chapters counter
    await counter.dec(ctx, "chapters");

    return { success: true };
  },
});

/**
 * Reorder pages in a chapter
 */
export const reorderPages = mutation({
  args: {
    chapterId: v.id("chapters"),
    pageIds: v.array(v.id("pages")),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    // Update each page with its new pageNumber
    for (let i = 0; i < args.pageIds.length; i++) {
      await ctx.db.patch(args.pageIds[i], {
        pageNumber: i + 1,
      });
    }

    return { success: true };
  },
});

/**
 * Get data for the reader page (pages with URLs)
 */
export const getReaderData = query({
  args: {
    slug: v.string(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get series by slug
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!series) return null;

    // 2. Get chapter by seriesId and chapterNumber
    const chapter = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", series._id).eq("chapterNumber", args.chapterNumber)
      )
      .unique();

    if (!chapter) return null;

    // 3. Get pages
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
      .collect();

    // Sort pages
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // 4. Get URLs
    const pageUrls = await Promise.all(
      pages.map(async (page) => {
        if (!page.storageId) return null;
        return await ctx.storage.getUrl(page.storageId);
      })
    );

    return {
      pageUrls: pageUrls.filter(Boolean) as string[],
      chapterId: chapter._id,
      seriesId: series._id,
      title: chapter.title,
    };
  },
});

/**
 * Get all chapters across all series for admin management
 * Includes series information and page count
 * Uses server-side pagination for better performance
 */
export const getAllChaptersAcrossSeries = query({
  args: {
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const result = await ctx.db
      .query("chapters")
      .order("desc")
      .paginate(args.paginationOpts);

    const chaptersWithDetails = await Promise.all(
      result.page.map(async (chapter) => {
        // Get series info
        const series = await ctx.db.get(chapter.seriesId);

        // Get page count
        const pages = await ctx.db
          .query("pages")
          .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
          .collect();

        return {
          ...chapter,
          seriesTitle: series?.title || "Unknown Series",
          seriesSlug: series?.slug || "",
          pageCount: pages.length,
        };
      })
    );

    return {
      ...result,
      page: chaptersWithDetails,
    };
  },
});
