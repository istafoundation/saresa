import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getISTDate } from "./lib/dates";
import { getChildIdFromSession, getAuthenticatedUser } from "./lib/auth";

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

// ============================================
// BATCHED MUTATIONS FOR PERFORMANCE
// ============================================

// Level thresholds with artifact unlocks - sync with constants/levels.ts and users.ts
const LEVELS = [
  { level: 1, xpRequired: 0, artifactId: null },
  { level: 2, xpRequired: 100, artifactId: "ganesha-wisdom" },
  { level: 3, xpRequired: 250, artifactId: "hanuman-strength" },
  { level: 4, xpRequired: 450, artifactId: "krishna-flute" },
  { level: 5, xpRequired: 700, artifactId: "arjuna-bow" },
  { level: 6, xpRequired: 1000, artifactId: "shiva-trident" },
  { level: 7, xpRequired: 1400, artifactId: "durga-lion" },
  { level: 8, xpRequired: 1900, artifactId: "rama-arrow" },
  { level: 9, xpRequired: 2500, artifactId: "vishnu-chakra" },
  { level: 10, xpRequired: 3200, artifactId: "lakshmi-lotus" },
  { level: 11, xpRequired: 4000, artifactId: null },
  { level: 12, xpRequired: 5000, artifactId: null },
  { level: 13, xpRequired: 6200, artifactId: null },
  { level: 14, xpRequired: 7600, artifactId: null },
  { level: 15, xpRequired: 9200, artifactId: null },
  { level: 16, xpRequired: 11000, artifactId: null },
  { level: 17, xpRequired: 13000, artifactId: null },
  { level: 18, xpRequired: 15500, artifactId: null },
  { level: 19, xpRequired: 18500, artifactId: null },
  { level: 20, xpRequired: 22000, artifactId: null },
];

/**
 * BATCHED: Finish Wordle game - handles XP, shards, and stats in one atomic operation
 * Reduces 3 separate API calls to 1, eliminating race conditions
 */
export const finishWordleGame = mutation({
  args: {
    token: v.string(),
    won: v.boolean(),
    guessCount: v.optional(v.number()), // 1-6 if won
    usedHint: v.boolean(),
    xpReward: v.number(),      // Pre-calculated XP to award
    shardReward: v.number(),   // Pre-calculated shards to award
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
    
    // ---- Calculate Wordle Stats ----
    const distribution = [...user.wordleGuessDistribution];
    if (args.won && args.guessCount) {
      distribution[args.guessCount - 1]++;
    }

    const wordleStats = {
      gamesPlayed: user.wordleGamesPlayed + 1,
      gamesWon: args.won ? user.wordleGamesWon + 1 : user.wordleGamesWon,
      currentStreak: args.won ? user.wordleCurrentStreak + 1 : 0,
      maxStreak: args.won
        ? Math.max(user.wordleMaxStreak, user.wordleCurrentStreak + 1)
        : user.wordleMaxStreak,
      guessDistribution: distribution,
      usedHint: args.usedHint,
    };

    // ---- Calculate XP and Artifact Unlocks ----
    const newXP = user.xp + args.xpReward;
    const unlockedArtifacts = [...user.unlockedArtifacts];
    let artifactsUpdated = false;

    for (const level of LEVELS) {
      if (newXP >= level.xpRequired && level.artifactId) {
        if (!unlockedArtifacts.includes(level.artifactId)) {
          unlockedArtifacts.push(level.artifactId);
          artifactsUpdated = true;
        }
      }
    }

    // ---- Calculate Shards ----
    const newShards = user.weaponShards + args.shardReward;

    // ---- Single Atomic Database Update ----
    await ctx.db.patch(user._id, {
      // Wordle stats
      wordleGamesPlayed: wordleStats.gamesPlayed,
      wordleGamesWon: wordleStats.gamesWon,
      wordleCurrentStreak: wordleStats.currentStreak,
      wordleMaxStreak: wordleStats.maxStreak,
      wordleGuessDistribution: distribution,
      wordleLastPlayedDate: today,
      // XP and artifacts
      xp: newXP,
      ...(artifactsUpdated ? { unlockedArtifacts } : {}),
      // Shards
      weaponShards: newShards,
    });

    // Return all updated values for immediate client use
    return {
      wordleStats,
      newXP,
      newShards,
      newArtifacts: artifactsUpdated ? unlockedArtifacts : null,
    };
  },
});

// Check if Wordle is available today
export const canPlayWordle = query({
  args: { 
    token: v.string(),
    clientDate: v.optional(v.string()) // Used to force re-query on day change
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

// Update Grammar Detective stats
export const updateGrammarDetectiveStats = mutation({
  args: {
    token: v.string(),
    questionsAnswered: v.number(),
    correctAnswers: v.number(),
    xpEarned: v.number(),
    currentQuestionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      gdQuestionsAnswered: (user.gdQuestionsAnswered ?? 0) + args.questionsAnswered,
      gdCorrectAnswers: (user.gdCorrectAnswers ?? 0) + args.correctAnswers,
      gdTotalXPEarned: (user.gdTotalXPEarned ?? 0) + args.xpEarned,
      gdCurrentQuestionIndex: args.currentQuestionIndex,
    });
  },
});

// Get Grammar Detective progress (for resuming)
export const getGrammarDetectiveProgress = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return null;

    return {
      questionsAnswered: user.gdQuestionsAnswered ?? 0,
      correctAnswers: user.gdCorrectAnswers ?? 0,
      totalXPEarned: user.gdTotalXPEarned ?? 0,
      currentQuestionIndex: user.gdCurrentQuestionIndex ?? 0,
    };
  },
});

// ============================================
// EXPLORER (India Explorer) STATS
// ============================================

// Total regions in India Explorer (28 states + 8 UTs)
// CRITICAL: Keep in sync with data/india-states.ts TOTAL_REGIONS via Shared Code or manual update
const TOTAL_EXPLORER_REGIONS = 36;

// Get Explorer progress for today (which states/UTs have been guessed)
export const getExplorerProgress = query({
  args: { 
    token: v.string(),
    clientDate: v.optional(v.string()) // Used to force re-query on day change
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return null;

    const today = getISTDate();
    
    // If last played date is not today, reset guessed list
    const guessedToday = user.expLastPlayedDate === today 
      ? (user.expGuessedToday ?? [])
      : [];

    return {
      guessedToday,
      correctAnswers: user.expCorrectAnswers ?? 0,
      totalXPEarned: user.expTotalXPEarned ?? 0,
      isCompletedToday: guessedToday.length >= TOTAL_EXPLORER_REGIONS,
    };
  },
});

// Update Explorer stats after answering a question
export const updateExplorerStats = mutation({
  args: {
    token: v.string(),
    regionId: v.string(),    // e.g., "IN-MH"
    correct: v.boolean(),
    xpEarned: v.number(),
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
    
    // Get current guessed list (reset if new day)
    let guessedToday = user.expLastPlayedDate === today 
      ? [...(user.expGuessedToday ?? [])]
      : [];
    
    // Add the region to guessed list if not already there
    if (!guessedToday.includes(args.regionId)) {
      guessedToday.push(args.regionId);
    }

    const updates: Record<string, any> = {
      expLastPlayedDate: today,
      expGuessedToday: guessedToday,
      expTotalXPEarned: (user.expTotalXPEarned ?? 0) + args.xpEarned,
    };

    if (args.correct) {
      updates.expCorrectAnswers = (user.expCorrectAnswers ?? 0) + 1;
    }

    await ctx.db.patch(user._id, updates);

    return {
      guessedToday,
      remaining: TOTAL_EXPLORER_REGIONS - guessedToday.length,
      isComplete: guessedToday.length >= TOTAL_EXPLORER_REGIONS,
    };
  },
});
