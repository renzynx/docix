import { components } from "./_generated/api";
import { ShardedCounter } from "@convex-dev/sharded-counter";
import type { Id } from "./_generated/dataModel";

// Only use sharded counters for view counts
// Other counts (series, users, chapters, etc.) use aggregates
export const counter = new ShardedCounter<Id<"series"> | Id<"chapters">>(
  components.shardedCounter,
  {
    defaultShards: 8,
  }
);
