import { components } from "./_generated/api";
import { ShardedCounter } from "@convex-dev/sharded-counter";
import type { Id } from "./_generated/dataModel";

/**
 * Sharded counter for high-throughput operations.
 *
 * Analytics Counters:
 * - "series": Total count of series
 * - "users": Total count of users
 * - "chapters": Total count of chapters
 * - "pages": Total count of pages
 * - "favorites": Total count of favorites/bookmarks
 * - "genres": Total count of genres
 * - "notifications": Total count of notifications
 *
 * View Counters:
 * - series ID: View count for each individual series
 * - chapter ID: View count for each individual chapter
 */
export const counter = new ShardedCounter<
  string | Id<"series"> | Id<"chapters"> | Id<"users">
>(components.shardedCounter, {
  shards: {
    // Analytics counters - higher shards for better write throughput
    series: 8,
    users: 8,
    chapters: 16, // Most frequent writes
    pages: 16, // Most frequent writes
    favorites: 8,
    genres: 2, // Low frequency
    notifications: 8,
  },
  // Default shards for individual view counters (series, chapters, etc.)
  // Lower shards since concurrent views for the same item are less likely
  defaultShards: 4,
});
