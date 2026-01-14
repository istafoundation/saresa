import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// IST timezone offset (UTC+5:30)
function getISTDate(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset).toISOString().split('T')[0];
}

function getYesterdayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() + istOffset - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().split('T')[0];
}

// Get current user data
export const getMyData = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    return user;
  },
});

// Check if user exists (for onboarding flow)
export const checkUserExists = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { exists: false, signedIn: false };
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    return { 
      exists: !!user, 
      signedIn: true,
      userData: user || null,
    };
  },
});

// Create new user after onboarding
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    mascot: v.union(v.literal("male"), v.literal("female")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (existing) {
      throw new Error("User already exists");
    }
    
    const today = getISTDate();
    
    await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
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
      
      // Word Finder stats
      wfEasyGamesPlayed: 0,
      wfEasyWordsFound: 0,
      wfHardGamesPlayed: 0,
      wfHardCorrectAnswers: 0,
      wfTotalXPEarned: 0,
      wfLastEasyDate: undefined,
      wfLastHardDate: undefined,
      wfEasyAttemptsToday: 0,
    });
  },
});

// Update streak on app open
export const updateStreak = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
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
];

// Add XP and check for level-ups/unlocks
export const addXP = mutation({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const newXP = user.xp + args.amount;
    const unlockedArtifacts = [...user.unlockedArtifacts];
    let updated = false;

    // Check for new unlocks based on total XP
    // This handles retroactive unlocks too
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
// Optimized to only write to DB if missing artifacts are found
export const syncProgression = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const unlockedArtifacts = [...user.unlockedArtifacts];
    let updated = false;

    // Check for new unlocks based on total XP
    for (const level of LEVELS) {
      if (user.xp >= level.xpRequired && level.artifactId) {
        if (!unlockedArtifacts.includes(level.artifactId)) {
          unlockedArtifacts.push(level.artifactId);
          updated = true;
        }
      }
    }
    
    // Only patch if we actually found missing items
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
  args: { artifactId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
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
  args: { weaponId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
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
    amount: v.number(),
    operation: v.union(v.literal("add"), v.literal("spend")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
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
  args: { weaponId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
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
