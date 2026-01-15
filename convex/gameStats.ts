import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// IST timezone helper
function getISTDate(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset).toISOString().split("T")[0];
}

// Helper to get childId from session token
async function getChildIdFromSession(
  ctx: any,
  token: string
): Promise<Id<"children"> | null> {
  if (!token) return null;

  const session = await ctx.db
    .query("childSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) return null;
  return session.childId;
}

// Update GK stats
export const updateGKStats = mutation({
  args: {
    token: v.string(),
    practiceTotal: v.optional(v.number()),
    practiceCorrect: v.optional(v.number()),
    playedCompetitive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const updates: Record<string, any> = {};

    if (args.practiceTotal !== undefined) {
      updates.gkPracticeTotal = user.gkPracticeTotal + args.practiceTotal;
    }
    if (args.practiceCorrect !== undefined) {
      updates.gkPracticeCorrect = user.gkPracticeCorrect + args.practiceCorrect;
    }
    if (args.playedCompetitive) {
      updates.gkLastCompetitiveDate = getISTDate();
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
  },
});

// Check if competitive GK is available today
export const canPlayGKCompetitive = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return false;

    const today = getISTDate();
    return user.gkLastCompetitiveDate !== today;
  },
});

// Update Wordle stats
export const updateWordleStats = mutation({
  args: {
    token: v.string(),
    won: v.boolean(),
    guessCount: v.optional(v.number()), // 1-6 if won
    usedHint: v.optional(v.boolean()), // Did user use hint this game?
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const today = getISTDate();
    const distribution = [...user.wordleGuessDistribution];

    if (args.won && args.guessCount) {
      distribution[args.guessCount - 1]++;
    }

    // Calculate the new stats values
    const newStats = {
      gamesPlayed: user.wordleGamesPlayed + 1,
      gamesWon: args.won ? user.wordleGamesWon + 1 : user.wordleGamesWon,
      currentStreak: args.won ? user.wordleCurrentStreak + 1 : 0,
      maxStreak: args.won
        ? Math.max(user.wordleMaxStreak, user.wordleCurrentStreak + 1)
        : user.wordleMaxStreak,
      guessDistribution: distribution,
      usedHint: args.usedHint ?? false,
    };

    await ctx.db.patch(user._id, {
      wordleGamesPlayed: newStats.gamesPlayed,
      wordleGamesWon: newStats.gamesWon,
      wordleCurrentStreak: newStats.currentStreak,
      wordleMaxStreak: newStats.maxStreak,
      wordleGuessDistribution: distribution,
      wordleLastPlayedDate: today,
    });

    // Return updated stats for immediate client use (avoids race condition)
    return newStats;
  },
});

// Check if Wordle is available today
export const canPlayWordle = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return false;

    const today = getISTDate();
    return user.wordleLastPlayedDate !== today;
  },
});

// Mark that user used a hint today (persists even if app is closed)
export const useWordleHint = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const today = getISTDate();
    await ctx.db.patch(user._id, { wordleHintUsedDate: today });
    return { success: true };
  },
});

// Check if user used a hint today (for restoring state after app restart)
export const didUseWordleHint = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return false;

    const today = getISTDate();
    return user.wordleHintUsedDate === today;
  },
});

// Update Word Finder stats
export const updateWordFinderStats = mutation({
  args: {
    token: v.string(),
    mode: v.union(v.literal("easy"), v.literal("hard")),
    wordsFound: v.number(),
    xpEarned: v.number(),
    correctAnswers: v.optional(v.number()), // For hard mode
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const today = getISTDate();
    const updates: Record<string, any> = {
      wfTotalXPEarned: user.wfTotalXPEarned + args.xpEarned,
    };

    if (args.mode === "easy") {
      updates.wfEasyGamesPlayed = user.wfEasyGamesPlayed + 1;
      updates.wfEasyWordsFound = user.wfEasyWordsFound + args.wordsFound;
      updates.wfLastEasyDate = today;

      // Reset or increment today's attempts
      if (user.wfLastEasyDate === today) {
        updates.wfEasyAttemptsToday = user.wfEasyAttemptsToday + 1;
      } else {
        updates.wfEasyAttemptsToday = 1;
      }
    } else {
      updates.wfHardGamesPlayed = user.wfHardGamesPlayed + 1;
      updates.wfHardCorrectAnswers =
        user.wfHardCorrectAnswers + (args.correctAnswers || 0);
      updates.wfLastHardDate = today;
    }

    await ctx.db.patch(user._id, updates);
  },
});

// Check Word Finder availability
export const canPlayWordFinder = query({
  args: {
    token: v.string(),
    mode: v.union(v.literal("easy"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return false;

    const today = getISTDate();

    if (args.mode === "easy") {
      if (user.wfLastEasyDate !== today) return true;
      return user.wfEasyAttemptsToday < 2; // 2 attempts per day
    } else {
      return user.wfLastHardDate !== today; // 1 attempt per day
    }
  },
});
