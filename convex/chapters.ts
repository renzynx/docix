import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isAuth, isAdmin } from "./helpers";
import {
  chaptersAggregate,
  chaptersBySeries,
  pagesAggregate,
} from "./aggregates";
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

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", args.id))
      .collect();

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
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", args.seriesId)
      )
      .collect();

    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

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

    // UPDATE AGGREGATES
    const chapter = await ctx.db.get(chapterId);
    if (chapter) {
      // 1. Update global chapter count
      await chaptersAggregate.insert(ctx, chapter);
      // 2. Update per-series chapter count
      await chaptersBySeries.insert(ctx, chapter);
    }

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

    // UPDATE AGGREGATE
    const page = await ctx.db.get(pageId);
    if (page) {
      await pagesAggregate.insert(ctx, page);
    }

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

    // Aggregates: Since `chaptersBySeries` uses `chapterNumber` as the sort key,
    // we must replace the entry in the aggregate if the number changes.
    if (
      args.chapterNumber !== undefined &&
      args.chapterNumber !== chapter.chapterNumber
    ) {
      const updatedChapterDoc = {
        ...chapter,
        chapterNumber: args.chapterNumber,
      };
      await chaptersBySeries.replace(ctx, chapter, updatedChapterDoc);
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

export const deletePage = mutation({
  args: { id: v.id("pages") },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const page = await ctx.db.get(args.id);
    if (!page) {
      throw new Error("Page not found");
    }

    if (page.storageId) {
      await ctx.storage.delete(page.storageId);
    }

    await ctx.db.delete(args.id);

    await pagesAggregate.delete(ctx, page);

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
      // Clean up page aggregate
      await pagesAggregate.delete(ctx, page);
    }

    // Delete the chapter
    await ctx.db.delete(args.id);

    // UPDATE AGGREGATES
    await chaptersAggregate.delete(ctx, chapter);
    await chaptersBySeries.delete(ctx, chapter);

    return { success: true };
  },
});

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

export const getReaderData = query({
  args: {
    slug: v.string(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!series) return null;

    const chapter = await ctx.db
      .query("chapters")
      .withIndex("by_series_id_and_number", (q) =>
        q.eq("seriesId", series._id).eq("chapterNumber", args.chapterNumber)
      )
      .unique();

    if (!chapter) return null;

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_chapter_id", (q) => q.eq("chapterId", chapter._id))
      .collect();

    // Sort pages
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

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

export const getAllChaptersAcrossSeries = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const totalCount = await chaptersAggregate.count(ctx);

    const result = await ctx.db
      .query("chapters")
      .order("desc")
      .paginate({ cursor: args.cursor || null, numItems: args.limit });

    const chaptersWithDetails = await Promise.all(
      result.page.map(async (chapter) => {
        const series = await ctx.db.get(chapter.seriesId);

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
      totalCount,
    };
  },
});

export const getChapterViewCount = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    return await counter.count(ctx, args.chapterId);
  },
});

export const incrementChapterView = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    await counter.inc(ctx, args.chapterId);
    const viewCount = await counter.count(ctx, args.chapterId);
    await ctx.db.patch(args.chapterId, { viewCount });
    return { viewCount };
  },
});
