import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getISTDate, getYesterdayIST } from "./lib/dates";
import { getChildIdFromSession, getAuthenticatedUser } from "./lib/auth";

// Get current user data (for child app)
// OPTIMIZED: Returns pre-computed daily limits to eliminate separate queries
export const getMyData = query({
  args: { 
    token: v.string(),
    // Optional date string to force re-evaluation when day changes at midnight
    clientDate: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return null;

    // Get child data
    const child = await ctx.db.get(childId);

    // Get subscription status FIRST (needed for group calculation)
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .order("desc")
      .first();

    const isSubscriptionActive = subscription?.status === "active" || subscription?.status === "authenticated";
    
    // Get group from subscription - ONLY subscribed users can access content
    // Subscription is the SINGLE SOURCE OF TRUTH for group
    const group = subscription?.planGroup || "B";

    // Pre-compute all daily limits (IST-based) to avoid separate queries
    const today = getISTDate();
    const TOTAL_REGIONS = 36; // Sync with data/india-states.ts

    return {
      ...user,
      // Child's learning group
      group,
      // Subscription status for mobile app display
      subscription: subscription ? {
        status: subscription.status,
        planGroup: subscription.planGroup,
        activatedTill: subscription.currentPeriodEnd,
        isActive: isSubscriptionActive,
      } : null,
      // Computed daily availability fields (eliminates 5+ separate queries)
      computed: {
        canPlayGKCompetitive: user.gkLastCompetitiveDate !== today,
        canPlayWordle: user.wordleLastPlayedDate !== today,
        canPlayWordFinderEasy: user.wfLastEasyDate !== today || user.wfEasyAttemptsToday < 2,
        canPlayWordFinderHard: user.wfLastHardDate !== today,
        didUseWordleHintToday: user.wordleHintUsedDate === today,
        // Explorer progress
        explorerGuessedToday: user.expLastPlayedDate === today 
          ? (user.expGuessedToday ?? []) 
          : [],
        explorerRemaining: user.expLastPlayedDate === today 
          ? TOTAL_REGIONS - (user.expGuessedToday?.length ?? 0) 
          : TOTAL_REGIONS,
        explorerIsComplete: user.expLastPlayedDate === today 
          ? (user.expGuessedToday?.length ?? 0) >= TOTAL_REGIONS
          : false,
      },
    };
  },
});

// Check if user exists (for onboarding flow)
export const checkUserExists = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return { exists: false, signedIn: false };

    const child = await ctx.db.get(childId);
    if (!child) return { exists: false, signedIn: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    return {
      exists: !!user,
      signedIn: true,
      childName: child.name,
      userData: user || null,
    };
  },
});

// Create new user after onboarding (child's first login)
export const createUser = mutation({
  args: {
    token: v.string(),
    mascot: v.union(v.literal("male"), v.literal("female")),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const child = await ctx.db.get(childId);
    if (!child) throw new Error("Child not found");

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const today = getISTDate();

    await ctx.db.insert("users", {
      childId,
      name: child.name, // Use name from child account

      mascot: args.mascot,
      onboardingComplete: true,

      // Initial progression
      xp: 0,
      streak: 1,
      lastLoginDate: today,

      // Empty collections
      unlockedArtifacts: [],
      unlockedWeapons: [],

      // Starting currency
      weaponShards: 100,
      weaponDuplicates: {},

      // GK stats
      gkPracticeTotal: 0,
      gkPracticeCorrect: 0,
      gkLastCompetitiveDate: undefined,

      // Wordle stats
      wordleGamesPlayed: 0,
      wordleGamesWon: 0,
      wordleCurrentStreak: 0,
      wordleMaxStreak: 0,
      wordleGuessDistribution: [0, 0, 0, 0, 0, 0],
      wordleLastPlayedDate: undefined,
      wordleHintUsedDate: undefined,

      // Word Finder stats
      wfEasyGamesPlayed: 0,
      wfEasyWordsFound: 0,
      wfHardGamesPlayed: 0,
      wfHardCorrectAnswers: 0,
      wfTotalXPEarned: 0,
      wfLastEasyDate: undefined,
      wfLastHardDate: undefined,
      wfEasyAttemptsToday: 0,

      // Grammar Detective stats
      gdQuestionsAnswered: 0,
      gdCorrectAnswers: 0,
      gdTotalXPEarned: 0,
      gdCurrentQuestionIndex: 0,
    });
  },
});

// Update streak on app open
export const updateStreak = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) return;

    const today = getISTDate();
    const yesterday = getYesterdayIST();

    // Already updated today
    if (user.lastLoginDate === today) return;

    if (user.lastLoginDate === yesterday) {
      // Consecutive day - increment streak
      await ctx.db.patch(user._id, {
        streak: user.streak + 1,
        lastLoginDate: today,
      });
    } else {
      // Streak broken - reset to 1
      await ctx.db.patch(user._id, {
        streak: 1,
        lastLoginDate: today,
      });
    }
  },
});

// Level thresholds with artifact unlocks - sync with constants/levels.ts
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

// Add XP and check for level-ups/unlocks
export const addXP = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const newXP = user.xp + args.amount;
    const unlockedArtifacts = [...user.unlockedArtifacts];
    let updated = false;

    // Check for new unlocks based on total XP
    for (const level of LEVELS) {
      if (newXP >= level.xpRequired && level.artifactId) {
        if (!unlockedArtifacts.includes(level.artifactId)) {
          unlockedArtifacts.push(level.artifactId);
          updated = true;
        }
      }
    }

    await ctx.db.patch(user._id, {
      xp: newXP,
      ...(updated ? { unlockedArtifacts } : {}),
    });

    return { newXP, newArtifacts: updated ? unlockedArtifacts : null };
  },
});

// Sync progression (Retroactive unlocks)
export const syncProgression = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const unlockedArtifacts = [...user.unlockedArtifacts];
    let updated = false;

    for (const level of LEVELS) {
      if (user.xp >= level.xpRequired && level.artifactId) {
        if (!unlockedArtifacts.includes(level.artifactId)) {
          unlockedArtifacts.push(level.artifactId);
          updated = true;
        }
      }
    }

    if (updated) {
      await ctx.db.patch(user._id, {
        unlockedArtifacts,
      });
      return { synced: true, count: unlockedArtifacts.length - user.unlockedArtifacts.length };
    }

    return { synced: false };
  },
});

// Unlock artifact
export const unlockArtifact = mutation({
  args: {
    token: v.string(),
    artifactId: v.string(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    if (!user.unlockedArtifacts.includes(args.artifactId)) {
      await ctx.db.patch(user._id, {
        unlockedArtifacts: [...user.unlockedArtifacts, args.artifactId],
      });
    }
  },
});

// Unlock weapon
export const unlockWeapon = mutation({
  args: {
    token: v.string(),
    weaponId: v.string(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    if (!user.unlockedWeapons.includes(args.weaponId)) {
      await ctx.db.patch(user._id, {
        unlockedWeapons: [...user.unlockedWeapons, args.weaponId],
      });
    }
  },
});

// Update weapon shards
export const updateShards = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
    operation: v.union(v.literal("add"), v.literal("spend")),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const newAmount = args.operation === "add"
      ? user.weaponShards + args.amount
      : user.weaponShards - args.amount;

    if (newAmount < 0) throw new Error("Insufficient shards");

    await ctx.db.patch(user._id, {
      weaponShards: newAmount,
    });

    return { newShards: newAmount };
  },
});

// Add weapon duplicate
export const addWeaponDuplicate = mutation({
  args: {
    token: v.string(),
    weaponId: v.string(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new Error("User not found");

    const current = user.weaponDuplicates[args.weaponId] || 0;
    await ctx.db.patch(user._id, {
      weaponDuplicates: {
        ...user.weaponDuplicates,
        [args.weaponId]: current + 1,
      },
    });
  },
});
