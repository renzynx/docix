import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  genres: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  series: defineTable({
    title: v.string(),
    slug: v.string(),
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
    searchableText: v.string(),
    updatedAt: v.float64(),
    viewCount: v.optional(v.float64()),
  })
    .index("by_slug", ["slug"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_genres", ["genres"])
    .searchIndex("search_series", {
      searchField: "searchableText",
      filterFields: ["status", "genres"],
    }),

  chapters: defineTable({
    seriesId: v.id("series"),
    chapterNumber: v.number(),
    title: v.optional(v.string()),
    viewCount: v.optional(v.float64()),
  })
    .index("by_series_id", ["seriesId"])
    .index("by_series_id_and_number", ["seriesId", "chapterNumber"]),

  pages: defineTable({
    chapterId: v.id("chapters"),
    pageNumber: v.number(),
    storageId: v.id("_storage"),
  }).index("by_chapter_id", ["chapterId", "pageNumber"]),

  users: defineTable({
    clerkUserId: v.string(),
  }).index("by_clerk_id", ["clerkUserId"]),

  favorites: defineTable({
    userId: v.id("users"),
    seriesId: v.id("series"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_series", ["userId", "seriesId"]),

  readingHistory: defineTable({
    userId: v.id("users"),
    chapterId: v.id("chapters"),
    seriesId: v.id("series"),
    lastViewedPage: v.number(),
  })
    .index("by_user_and_chapter", ["userId", "chapterId"])
    .index("by_user_and_series", ["userId", "seriesId"]),

  notifications: defineTable({
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
    isRead: v.boolean(),
    link: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),
});
