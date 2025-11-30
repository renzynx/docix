import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { isAdmin } from "./helpers";
import { usersAggregate } from "./aggregates";

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
      const userId = await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
      });
      const newUser = await ctx.db.get(userId);
      if (newUser) await usersAggregate.insert(ctx, newUser);
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
      await usersAggregate.delete(ctx, user);
    }
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    await isAdmin(ctx);

    return await ctx.db.query("users").collect();
  },
});

export const getCurrentUser = query({
  handler: (ctx) => {
    return ctx.auth.getUserIdentity();
  },
});
