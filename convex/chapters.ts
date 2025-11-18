import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isAuth, isAdmin } from "./helpers";

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
    const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Get URLs for each page
    const pagesWithUrls = await Promise.all(
      sortedPages.map(async (page) => {
        const url = await ctx.storage.getUrl(page.storageId);
        return {
          ...page,
          url,
        };
      })
    );

    return {
      ...chapter,
      pages: pagesWithUrls,
    };
  },
});

export const getReaderData = query({
  args: {
    slug: v.string(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Find the series by slug
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!series) {
      return null;
    }

    const chapter = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", series._id).eq("chapterNumber", args.chapterNumber)
      )
      .unique();

    if (!chapter) {
      return null;
    }

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
      .collect();

    // Sort pages by pageNumber
    const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const pageUrls = await Promise.all(
      sortedPages.map((page) => ctx.storage.getUrl(page.storageId))
    );

    return {
      seriesId: series._id,
      chapterId: chapter._id,
      pageUrls: pageUrls.filter((url) => url !== null) as string[],
    };
  },
});

export const updateProgress = mutation({
  args: {
    chapterId: v.id("chapters"),
    seriesId: v.id("series"),
    pageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await isAuth(ctx);

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

    // Delete the chapter
    await ctx.db.delete(args.id);

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
