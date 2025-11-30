import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { isAdmin } from "./helpers";
import { counter } from "./counter";

export const updateOrCreateUser = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (user === null) {
      await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
      });
      await counter.inc(ctx, "users");
    } else {
      await ctx.db.patch(user._id, { clerkUserId: args.clerkUserId });
    }
  },
});

export const deleteUser = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (user !== null) {
      await ctx.db.delete(user._id);
      await counter.dec(ctx, "users");
    }
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    await isAdmin(ctx);

    return await ctx.db.query("users").collect();
  },
});
