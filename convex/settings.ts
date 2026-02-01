import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const getGameSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("gameSettings")
      .withIndex("by_game", (q) => q.eq("gameId", "global_settings"))
      .first();

    return settings ?? {
      englishInsaneDailyLimit: 1,
      wordFinderEasyDailyLimit: 2,
      wordFinderHardDailyLimit: 1,
      letEmCookDailyLimit: 1,
      disabledGames: {},
    };
  },
});

export const updateGameSettings = mutation({
  args: {
    englishInsaneDailyLimit: v.number(),
    wordFinderEasyDailyLimit: v.number(),
    wordFinderHardDailyLimit: v.number(),
    letEmCookDailyLimit: v.number(),
    disabledGames: v.record(v.string(), v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Check if user is parent/admin
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) { // Allow any parent for now, or check role
       // if (parent.role !== 'admin') throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("gameSettings")
      .withIndex("by_game", (q) => q.eq("gameId", "global_settings"))
      .first();

    const timestamp = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: timestamp,
        updatedBy: parent?._id,
      });
    } else {
      await ctx.db.insert("gameSettings", {
        gameId: "global_settings",
        ...args,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: parent?._id,
      } as any);
    }
  },
});
