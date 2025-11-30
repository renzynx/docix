import { QueryCtx, MutationCtx } from "./_generated/server";
import removeAccents from "remove-accents";
import slugify from "slugify";

export const isAuth = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new Error("Unauthenticated call");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (user === null) {
    throw new Error("User not found in database");
  }

  return user;
};

export const isAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity || identity?.role !== "admin") {
    throw new Error("Unauthorized: Admins only");
  }
};

export const isModerator = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity || identity?.role !== "moderator") {
    throw new Error("Unauthorized: Moderators only");
  }
};

export const generateSlug = (title: string) => {
  const noAccents = removeAccents(title);
  return slugify(noAccents, { lower: true, strict: true });
};
