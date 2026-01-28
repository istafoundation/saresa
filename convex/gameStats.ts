import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getISTDate } from "./lib/dates";
import { getChildIdFromSession, getAuthenticatedUser } from "./lib/auth";
import { LEVELS, getUnlockedArtifactsForXP } from "./lib/levels";

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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

// LEVELS imported from ./lib/levels.ts - Single Source of Truth
// See convex/lib/levels.ts for the configuration

/**
 * Calculate Wordle XP reward server-side
 * XP is based on performance: fewer guesses = more XP
 * Using hint reduces XP by 50%
 */
function calculateWordleXP(won: boolean, guessCount?: number, usedHint?: boolean): number {
  if (!won) return 10; // Consolation XP for trying
  
  // Base XP by guess count (fewer guesses = more XP)
  const baseXP: Record<number, number> = {
    1: 50, // Perfect!
    2: 45,
    3: 40,
    4: 35,
    5: 30,
    6: 25,
  };
  
  const xp = baseXP[guessCount ?? 6] ?? 25;
  return usedHint ? Math.floor(xp * 0.5) : xp;
}

/**
 * Calculate Wordle shard reward server-side
 */
function calculateWordleShards(won: boolean, guessCount?: number): number {
  if (!won) return 2; // Small consolation
  
  const shards: Record<number, number> = {
    1: 15,
    2: 12,
    3: 10,
    4: 8,
    5: 6,
    6: 5,
  };
  
  return shards[guessCount ?? 6] ?? 5;
}

/**
 * BATCHED: Finish Wordle game - handles XP, shards, and stats in one atomic operation
 * Reduces 3 separate API calls to 1, eliminating race conditions
 * SECURITY: Rewards are now calculated SERVER-SIDE to prevent manipulation
 */
export const finishWordleGame = mutation({
  args: {
    token: v.string(),
    won: v.boolean(),
    guessCount: v.optional(v.number()), // 1-6 if won
    usedHint: v.boolean(),
    // Client values are IGNORED for security - kept for backward compatibility
    xpReward: v.optional(v.number()),
    shardReward: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    // Validate guessCount if provided
    if (args.guessCount !== undefined && (args.guessCount < 1 || args.guessCount > 6)) {
      throw new ConvexError("Invalid guess count");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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

    // ---- Calculate Rewards SERVER-SIDE (ignore client values) ----
    const xpReward = calculateWordleXP(args.won, args.guessCount, args.usedHint);
    const shardReward = calculateWordleShards(args.won, args.guessCount);

    // ---- Calculate XP and Artifact Unlocks ----
    const newXP = user.xp + xpReward;
    
    // Use shared helper function for artifact unlocks
    const { updated: artifactsUpdated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      newXP, 
      user.unlockedArtifacts
    );

    // ---- Calculate Shards ----
    const newShards = user.weaponShards + shardReward;

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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
    xpEarned: v.optional(v.number()), // DEPRECATED: Ignored, calculated server-side
    correctAnswers: v.optional(v.number()), // For hard mode
    // New args for server-side calculation
    timeRemaining: v.optional(v.number()),
    hintUsed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const today = getISTDate();
    
    // Server-side XP Calculation
    const MAX_TIME = 600;
    const timeRemaining = args.timeRemaining ?? 0;
    const timeBonus = 1 + 0.5 * (timeRemaining / MAX_TIME);
    
    let calculatedXP = 0;
    
    if (args.mode === "easy") {
        const baseXP = args.wordsFound * 10;
        calculatedXP = Math.min(50, Math.round(baseXP * timeBonus));
    } else {
        const correct = args.correctAnswers ?? 0;
        const baseXP = correct * 40;
        const hintPenalty = args.hintUsed ? 0.5 : 1;
        calculatedXP = Math.min(200, Math.round(baseXP * timeBonus * hintPenalty));
    }

    const updates: Record<string, any> = {
      wfTotalXPEarned: user.wfTotalXPEarned + calculatedXP,
      // Add XP to user total
      xp: user.xp + calculatedXP, 
    };
    
    // Check for artifact unlocks
    const { updated: artifactsUpdated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      updates.xp, 
      user.unlockedArtifacts
    );
    if (artifactsUpdated) {
        updates.unlockedArtifacts = unlockedArtifacts;
    }

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

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

// ============================================
// LET'EM COOK (Spice Matching) STATS
// One-time game - user can only attempt once ever
// ============================================

const TOTAL_SPICES = 30;
const LEC_XP_PER_CORRECT = 10;

// Check if user can play Let'em Cook (Daily Challenge)
export const canPlayLetEmCook = query({
  args: { 
    token: v.string(),
    clientDate: v.optional(v.string()) // Used to force re-query on day change
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return { canPlay: false, stats: null };

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return { canPlay: false, stats: null };

    const today = getISTDate();
    
    // Can play if last played date is NOT today
    const canPlay = user.lecLastPlayedDate !== today;

    // Return today's stats if played, or previous stats? 
    // Actually, if they can play, stats should be null or 0.
    // If they cannot play (already played today), show today's stats.
    
    return {
      canPlay,
      stats: !canPlay ? {
        correctAnswers: user.lecDailyScore ?? 0,
        totalXPEarned: user.lecDailyXP ?? 0,
        // For daily challenge, we don't really have a "completedAt" but we can infer it
        completedAt: Date.now(), // Placeholder or use last updated
      } : null,
    };
  },
});

// Finish Let'em Cook game - handles XP and marks as completed for today
export const finishLetEmCook = mutation({
  args: {
    token: v.string(),
    correctCount: v.number(),
    totalQuestions: v.number(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const today = getISTDate();
    
    // Double check if already played today
    if (user.lecLastPlayedDate === today) {
      throw new ConvexError("Daily challenge already completed today");
    }

    // Calculate XP server-side
    const xpEarned = args.correctCount * LEC_XP_PER_CORRECT;

    // Check for artifact unlocks with new XP
    const newXP = user.xp + xpEarned;
    
    // Use shared helper function for artifact unlocks
    const { updated: artifactsUpdated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      newXP, 
      user.unlockedArtifacts
    );

    // Update user stats
    await ctx.db.patch(user._id, {
      lecLastPlayedDate: today,
      lecDailyScore: args.correctCount,
      lecDailyXP: xpEarned,
      lecTotalCorrect: (user.lecTotalCorrect ?? 0) + args.correctCount,
      lecTotalGamesPlayed: (user.lecTotalGamesPlayed ?? 0) + 1,
      xp: newXP,
      ...(artifactsUpdated ? { unlockedArtifacts } : {}),
    });

    return {
      xpEarned,
      newXP,
      correctCount: args.correctCount,
      totalQuestions: args.totalQuestions,
      artifactsUnlocked: artifactsUpdated ? unlockedArtifacts : null,
    };
  },
});

// ============================================
// FLAG CHAMPS (Fill-in-Blanks Flag Guessing) STATS
// Daily challenge with batched syncing (every 5 mins)
// ============================================

const TOTAL_FLAGS = 195;

// Get Flag Champs progress (called once on mount for resume capability)
export const getFlagChampsProgress = query({
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
    
    // If last played date is not today, reset daily progress
    const isNewDay = user.fcLastPlayedDate !== today;
    const guessedToday = isNewDay ? [] : (user.fcGuessedToday ?? []);
    const correctToday = isNewDay ? 0 : (user.fcCorrectToday ?? 0);
    const dailyXP = isNewDay ? 0 : (user.fcDailyXP ?? 0);

    return {
      guessedToday,
      correctToday,
      dailyXP,
      bestScore: user.fcBestScore ?? 0,
      totalGamesCompleted: user.fcTotalGamesCompleted ?? 0,
      isCompletedToday: guessedToday.length >= TOTAL_FLAGS,
    };
  },
});

// Batch sync Flag Champs stats (called every 5 mins, on exit, on background)
export const syncFlagChampsStats = mutation({
  args: {
    token: v.string(),
    newGuessed: v.array(v.string()),  // IDs answered since last sync
    newCorrect: v.number(),           // Correct count since last sync
    newXP: v.number(),                // XP earned since last sync (Client claim)
    isGameComplete: v.boolean(),      // True if all 195 answered
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const today = getISTDate();
    
    // Get current state (reset if new day)
    const isNewDay = user.fcLastPlayedDate !== today;
    let guessedToday = isNewDay ? [] : [...(user.fcGuessedToday ?? [])];
    let correctToday = isNewDay ? 0 : (user.fcCorrectToday ?? 0);
    let dailyXP = isNewDay ? 0 : (user.fcDailyXP ?? 0);

    // Merge new progress (avoid duplicates)
    for (const id of args.newGuessed) {
      if (!guessedToday.includes(id)) {
        guessedToday.push(id);
      }
    }
    correctToday += args.newCorrect;
    
    // Validate XP Claim (Clamping)
    // Max XP = (Correct * 5) + (Wrong * 1)
    // Wrong count = Total attempts in this batch - Correct attempts
    // Note: This logic assumes args.newGuessed contains ALL attempts from this batch
    // If client is honest, newGuessed.length >= newCorrect
    const wrongCount = Math.max(0, args.newGuessed.length - args.newCorrect);
    const maxPossibleXP = (args.newCorrect * 5) + (wrongCount * 1);
    
    // Clamp to prevent massive spoofing
    const validatedXP = Math.min(args.newXP, maxPossibleXP);
    
    dailyXP += validatedXP;

    // Calculate new total XP
    const newXP = user.xp + validatedXP;

    // Check for artifact unlocks
    // Use shared helper function for artifact unlocks
    const { updated: artifactsUpdated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      newXP, 
      user.unlockedArtifacts
    );

    // Update best score if game is complete and we beat previous best
    let newBestScore = user.fcBestScore ?? 0;
    let totalGamesCompleted = user.fcTotalGamesCompleted ?? 0;

    if (args.isGameComplete) {
      if (correctToday > newBestScore) {
        newBestScore = correctToday;
      }
      // Only increment if this is a new completion (not a repeat sync)
      // We check if we JUST reached 195 with this sync
      if (guessedToday.length === 195 && (user.fcGuessedToday?.length ?? 0) < 195) {
        totalGamesCompleted += 1;
      }
    }

    // Update user
    await ctx.db.patch(user._id, {
      fcLastPlayedDate: today,
      fcGuessedToday: guessedToday,
      fcCorrectToday: correctToday,
      fcDailyXP: dailyXP,
      fcBestScore: newBestScore,
      fcTotalGamesCompleted: totalGamesCompleted,
      xp: newXP,
      ...(artifactsUpdated ? { unlockedArtifacts } : {}),
    });

    return {
      synced: args.newGuessed.length,
      totalGuessed: guessedToday.length,
      correctToday,
      dailyXP,
      bestScore: newBestScore,
      isComplete: guessedToday.length >= 195,
      xpAwarded: validatedXP
    };
  },
});
