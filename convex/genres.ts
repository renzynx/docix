import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateSlug, isAdmin } from "./helpers";
import { genresAggregate } from "./aggregates";

export const getAllGenres = query({
  handler: async (ctx) => {
    const genres = await ctx.db.query("genres").collect();
    return genres;
  },
});

export const getGenreById = query({
  args: { id: v.id("genres") },
  handler: async (ctx, args) => {
    const genre = await ctx.db.get(args.id);
    return genre;
  },
});

export const getGenreBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const genre = await ctx.db
      .query("genres")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return genre;
  },
});

export const createGenre = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existing = await ctx.db
      .query("genres")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error("A genre with this name already exists");
    }

    const genreId = await ctx.db.insert("genres", {
      name: args.name,
      slug,
      description: args.description,
    });

    // Increment genres aggregate
    const genre = await ctx.db.get(genreId);
    if (genre) await genresAggregate.insert(ctx, genre);

    return genreId;
  },
});

export const updateGenre = mutation({
  args: {
    id: v.id("genres"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const genre = await ctx.db.get(args.id);

    if (!genre) {
      throw new Error("Genre not found");
    }

    const slug =
      args.name !== genre.name ? generateSlug(args.name) : genre.slug;

    if (slug !== genre.slug) {
      const existing = await ctx.db
        .query("genres")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing && existing._id !== args.id) {
        throw new Error("A genre with this name already exists");
      }
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      slug,
      description: args.description,
    });

    return args.id;
  },
});

export const deleteGenre = mutation({
  args: { id: v.id("genres") },
  handler: async (ctx, args) => {
    await isAdmin(ctx);

    const genre = await ctx.db.get(args.id);

    if (!genre) {
      throw new Error("Genre not found");
    }

    const seriesWithGenre = await ctx.db
      .query("series")
      .filter((q) => q.eq(q.field("genres"), [genre.name]))
      .collect();

    if (seriesWithGenre.length > 0) {
      throw new Error(
        `Cannot delete genre: ${seriesWithGenre.length} series are using it`
      );
    }

    await ctx.db.delete(args.id);

    // Decrement genres aggregate
    await genresAggregate.delete(ctx, genre);

    return args.id;
  },
});
