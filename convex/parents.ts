import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get or create parent account after Clerk login
export const getOrCreateParent = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if parent exists
    const existing = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      return existing;
    }

    // Create new parent
    const parentId = await ctx.db.insert("parents", {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
    });

    return await ctx.db.get(parentId);
  },
});

// Get current parent data
export const getMyParentData = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// Check if username is available
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("children")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    return { available: !existing };
  },
});

// Add a new child
export const addChild = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get parent
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) throw new Error("Parent not found");

    // Validate username
    const username = args.username.toLowerCase().trim();
    if (username.length < 4 || username.length > 20) {
      throw new Error("Username must be 4-20 characters");
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, and underscores");
    }

    // Check uniqueness
    const existing = await ctx.db
      .query("children")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existing) {
      throw new Error("Username already taken");
    }

    // Validate password
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create child
    const childId = await ctx.db.insert("children", {
      parentId: parent._id,
      username,
      password: args.password, // Stored as plaintext for parent visibility
      name: args.name.trim(),
      role: "user",
      createdAt: Date.now(),
    });

    return {
      childId,
      username,
      password: args.password,
      name: args.name.trim(),
    };
  },
});

// Get all children for current parent
export const getMyChildren = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) return [];

    const children = await ctx.db
      .query("children")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .collect();

    // Get user data for each child
    const childrenWithStats = await Promise.all(
      children.map(async (child) => {
        const userData = await ctx.db
          .query("users")
          .withIndex("by_child_id", (q) => q.eq("childId", child._id))
          .first();

        return {
          _id: child._id,
          name: child.name,
          username: child.username,
          password: child.password, // Parent can always see
          role: child.role,
          createdAt: child.createdAt,
          lastLoginAt: child.lastLoginAt,
          // Stats from user data
          xp: userData?.xp ?? 0,
          streak: userData?.streak ?? 0,
          level: userData ? Math.floor(userData.xp / 100) + 1 : 1,
          hasPlayedToday: userData?.lastLoginDate === new Date().toISOString().split('T')[0],
        };
      })
    );

    return childrenWithStats;
  },
});

// Get child credentials (for sharing)
export const getChildCredentials = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) throw new Error("Parent not found");

    const child = await ctx.db.get(args.childId);
    if (!child || child.parentId !== parent._id) {
      throw new Error("Child not found");
    }

    return {
      name: child.name,
      username: child.username,
      password: child.password,
    };
  },
});

// Regenerate child password
export const regeneratePassword = mutation({
  args: {
    childId: v.id("children"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) throw new Error("Parent not found");

    const child = await ctx.db.get(args.childId);
    if (!child || child.parentId !== parent._id) {
      throw new Error("Child not found");
    }

    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Update password
    await ctx.db.patch(args.childId, {
      password: args.newPassword,
    });

    // Invalidate all sessions for this child
    const sessions = await ctx.db
      .query("childSessions")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true, newPassword: args.newPassword };
  },
});

// Delete child account
export const deleteChild = mutation({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) throw new Error("Parent not found");

    const child = await ctx.db.get(args.childId);
    if (!child || child.parentId !== parent._id) {
      throw new Error("Child not found");
    }

    // Delete user data
    const userData = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", args.childId))
      .first();

    if (userData) {
      await ctx.db.delete(userData._id);
    }

    // Delete sessions
    const sessions = await ctx.db
      .query("childSessions")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete child
    await ctx.db.delete(args.childId);

    return { success: true };
  },
});

// Get detailed child stats (for parent dashboard)
export const getChildStats = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent) return null;

    const child = await ctx.db.get(args.childId);
    if (!child || child.parentId !== parent._id) return null;

    const userData = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", args.childId))
      .first();

    if (!userData) {
      return {
        child: {
          name: child.name,
          username: child.username,
          createdAt: child.createdAt,
          lastLoginAt: child.lastLoginAt,
        },
        hasPlayed: false,
      };
    }

    return {
      child: {
        name: child.name,
        username: child.username,
        createdAt: child.createdAt,
        lastLoginAt: child.lastLoginAt,
      },
      hasPlayed: true,
      profile: {
        mascot: userData.mascot,
        xp: userData.xp,
        streak: userData.streak,
        lastLoginDate: userData.lastLoginDate,
      },
      collections: {
        artifacts: userData.unlockedArtifacts.length,
        weapons: userData.unlockedWeapons.length,
        shards: userData.weaponShards,
      },
      gkStats: {
        practiceTotal: userData.gkPracticeTotal,
        practiceCorrect: userData.gkPracticeCorrect,
        accuracy: userData.gkPracticeTotal > 0
          ? Math.round((userData.gkPracticeCorrect / userData.gkPracticeTotal) * 100)
          : 0,
      },
      wordleStats: {
        gamesPlayed: userData.wordleGamesPlayed,
        gamesWon: userData.wordleGamesWon,
        currentStreak: userData.wordleCurrentStreak,
        maxStreak: userData.wordleMaxStreak,
        wordleGuessDistribution: userData.wordleGuessDistribution,
      },
      wordFinderStats: {
        easyGamesPlayed: userData.wfEasyGamesPlayed,
        hardGamesPlayed: userData.wfHardGamesPlayed,
        totalXPEarned: userData.wfTotalXPEarned,
      },
    };
  },
});
