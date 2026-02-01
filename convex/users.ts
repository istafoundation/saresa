import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getISTDate, getYesterdayIST } from "./lib/dates";
import { getChildIdFromSession, getAuthenticatedUser } from "./lib/auth";
import { checkRateLimit } from "./lib/rateLimit";
import { LEVELS, VALID_ARTIFACT_IDS, getUnlockedArtifactsForXP } from "./lib/levels";

// Maximum XP that can be added in a single operation (prevents exploits)
const MAX_XP_PER_OPERATION = 100;
// Maximum coins that can be added/spent in a single operation
const MAX_COINS_PER_SPEND_OPERATION = 200;
// Maximum coins that can be added in a single operation
const MAX_COINS_PER_OPERATION = 200;

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

    // Get subscription status FIRST
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .order("desc")
      .first();

    const isSubscriptionActive = subscription?.status === "active" || subscription?.status === "authenticated";
    


    // Pre-compute all daily limits (IST-based) to avoid separate queries
    const today = getISTDate();
    const TOTAL_REGIONS = 36; // Sync with data/india-states.ts

    return {
      ...user,

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
    if (!childId) throw new ConvexError("Not authenticated");

    const child = await ctx.db.get(childId);
    if (!child) throw new ConvexError("Child not found");

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (existing) {
      throw new ConvexError("User already exists");
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
      coins: 0, // Starting coins

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

// LEVELS imported from ./lib/levels.ts - Single Source of Truth
// See convex/lib/levels.ts for the configuration

// Add XP and check for level-ups/unlocks
export const addXP = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    // Validate XP amount bounds
    if (args.amount <= 0 || args.amount > MAX_XP_PER_OPERATION) {
      throw new ConvexError(`XP amount must be between 1 and ${MAX_XP_PER_OPERATION}`);
    }

    // Get child info for rate limiting
    const child = await ctx.db.get(childId);
    
    // Rate limit: 20 XP operations per minute
    await checkRateLimit(
      ctx, 
      "addXP", 
      childId as string, 
      childId, 
      child?.name, 
      child?.username
    );

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const newXP = user.xp + args.amount;
    
    // Use shared helper function for artifact unlocks
    const { updated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      newXP, 
      user.unlockedArtifacts
    );

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    // Use shared helper function for artifact unlocks
    const { updated, artifacts: unlockedArtifacts } = getUnlockedArtifactsForXP(
      user.xp, 
      user.unlockedArtifacts
    );

    if (updated) {
      await ctx.db.patch(user._id, {
        unlockedArtifacts,
      });
      return { synced: true, count: unlockedArtifacts.length - user.unlockedArtifacts.length };
    }

    return { synced: false };
  },
});

// VALID_ARTIFACT_IDS imported from ./lib/levels.ts

// Unlock artifact - validates against known artifacts
export const unlockArtifact = mutation({
  args: {
    token: v.string(),
    artifactId: v.string(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    // Validate artifact ID against known artifacts
    if (!VALID_ARTIFACT_IDS.includes(args.artifactId)) {
      throw new ConvexError("Invalid artifact ID");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    // Check if user has enough XP for this artifact
    const requiredLevel = LEVELS.find(l => l.artifactId === args.artifactId);
    if (requiredLevel && user.xp < requiredLevel.xpRequired) {
      throw new ConvexError("Not enough XP to unlock this artifact");
    }

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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    if (!user.unlockedWeapons.includes(args.weaponId)) {
      await ctx.db.patch(user._id, {
        unlockedWeapons: [...user.unlockedWeapons, args.weaponId],
      });
    }
  },
});

// Update coins (add or spend)
export const updateCoins = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
    operation: v.union(v.literal("add"), v.literal("spend")),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    // Validate amount bounds
    if (args.amount <= 0 || args.amount > MAX_COINS_PER_SPEND_OPERATION) {
      throw new ConvexError(`Coin amount must be between 1 and ${MAX_COINS_PER_SPEND_OPERATION}`);
    }

    // Rate limit for coin operations
    const child = await ctx.db.get(childId);
    await checkRateLimit(
      ctx, 
      "updateCoins", 
      childId as string, 
      childId, 
      child?.name, 
      child?.username
    );

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const currentCoins = user.coins ?? 0;
    const newAmount = args.operation === "add"
      ? currentCoins + args.amount
      : currentCoins - args.amount;

    if (newAmount < 0) throw new ConvexError("Insufficient coins");

    await ctx.db.patch(user._id, {
      coins: newAmount,
    });

    return { newCoins: newAmount };
  },
});

// Add coins (earned from successful game completions)
export const addCoins = mutation({
  args: {
    token: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const childId = await getChildIdFromSession(ctx, args.token);
    if (!childId) throw new ConvexError("Not authenticated");

    // Validate coin amount bounds
    if (args.amount <= 0 || args.amount > MAX_COINS_PER_OPERATION) {
      throw new ConvexError(`Coin amount must be between 1 and ${MAX_COINS_PER_OPERATION}`);
    }

    // Rate limit for coin operations
    const child = await ctx.db.get(childId);
    await checkRateLimit(
      ctx, 
      "addCoins", 
      childId as string, 
      childId, 
      child?.name, 
      child?.username
    );

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const newCoins = (user.coins ?? 0) + args.amount;

    await ctx.db.patch(user._id, {
      coins: newCoins,
    });

    return { newCoins };
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
    if (!childId) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", childId))
      .first();

    if (!user) throw new ConvexError("User not found");

    const current = user.weaponDuplicates[args.weaponId] || 0;
    await ctx.db.patch(user._id, {
      weaponDuplicates: {
        ...user.weaponDuplicates,
        [args.weaponId]: current + 1,
      },
    });
  },
});
