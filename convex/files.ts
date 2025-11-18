import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isAdmin } from "./helpers";

export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const generateUploadUrls = mutation({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const postUrls: string[] = [];

    for (let i = 0; i < args.count; i++) {
      const postUrl = await ctx.storage.generateUploadUrl();
      postUrls.push(postUrl);
    }

    return postUrls;
  },
});

export const createChapterAndPages = mutation({
  args: {
    seriesId: v.id("series"),
    chapterNumber: v.number(),
    title: v.optional(v.string()),
    pageStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const newChapterId = await ctx.db.insert("chapters", {
      seriesId: args.seriesId,
      chapterNumber: args.chapterNumber,
      title: args.title,
    });

    await Promise.all(
      args.pageStorageIds.map((storageId, index) => {
        return ctx.db.insert("pages", {
          chapterId: newChapterId,
          storageId: storageId,
          pageNumber: index + 1, // Page numbers are 1-based
        });
      })
    );

    return { chapterId: newChapterId };
  },
});
