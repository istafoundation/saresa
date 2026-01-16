import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getISTDate } from "./lib/dates";

// Level thresholds matching constants/levels.ts
const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 450 },
  { level: 5, xpRequired: 700 },
  { level: 6, xpRequired: 1000 },
  { level: 7, xpRequired: 1400 },
  { level: 8, xpRequired: 1900 },
  { level: 9, xpRequired: 2500 },
  { level: 10, xpRequired: 3200 },
  { level: 11, xpRequired: 4000 },
  { level: 12, xpRequired: 5000 },
  { level: 13, xpRequired: 6200 },
  { level: 14, xpRequired: 7600 },
  { level: 15, xpRequired: 9200 },
  { level: 16, xpRequired: 11000 },
  { level: 17, xpRequired: 13000 },
  { level: 18, xpRequired: 15500 },
  { level: 19, xpRequired: 18500 },
  { level: 20, xpRequired: 22000 },
];

function getLevelForXP(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level;
    }
  }
  return 1;
}

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

// Get current user's role 
export const getMyRole = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return "parent";

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return parent?.role || "parent";
  },
});

// Check if current user is admin
export const isAdmin = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return parent?.role === "admin";
  },
});

// Admin: Search children by username or name (limited results)
export const adminSearchChildren = query({
  args: { 
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify admin
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent || parent.role !== "admin") return [];

    const query = args.searchQuery.toLowerCase().trim();
    if (query.length < 2) return []; // Minimum 2 chars

    const limit = args.limit || 10;

    // Search all children (we filter in memory for text search)
    const allChildren = await ctx.db.query("children").collect();
    
    const matched = allChildren
      .filter(c => 
        c.username.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
      )
      .slice(0, limit);

    // Get parent info for each matched child
    return Promise.all(matched.map(async (child) => {
      const childParent = await ctx.db.get(child.parentId);
      return {
        _id: child._id,
        name: child.name,
        username: child.username,
        parentName: childParent?.name || "Unknown",
        parentEmail: childParent?.email || "",
        createdAt: child.createdAt,
        lastLoginAt: child.lastLoginAt,
      };
    }));
  },
});

// Admin: Get detailed stats for any child
export const adminGetChildStats = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify admin
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!parent || parent.role !== "admin") return null;

    const child = await ctx.db.get(args.childId);
    if (!child) return null;

    const childParent = await ctx.db.get(child.parentId);
    
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
        parent: {
          name: childParent?.name || "Unknown",
          email: childParent?.email || "",
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
      parent: {
        name: childParent?.name || "Unknown",
        email: childParent?.email || "",
      },
      hasPlayed: true,
      profile: {
        mascot: userData.mascot,
        xp: userData.xp,
        streak: userData.streak,
        lastLoginDate: userData.lastLoginDate,
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
      },
      wordFinderStats: {
        easyGamesPlayed: userData.wfEasyGamesPlayed,
        hardGamesPlayed: userData.wfHardGamesPlayed,
        totalXPEarned: userData.wfTotalXPEarned,
      },
    };
  },
});

// Check if username is available
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("children")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.toLowerCase())
      )
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
      throw new Error(
        "Username can only contain letters, numbers, and underscores"
      );
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

    const today = getISTDate();

    // Get user data for each child
    const childrenWithStats = await Promise.all(
      children.map(async (child) => {
        const userData = await ctx.db
          .query("users")
          .withIndex("by_child_id", (q) => q.eq("childId", child._id))
          .first();

        // Calculate games played from all game stats
        const gamesPlayed = userData
          ? userData.wordleGamesPlayed +
            userData.wfEasyGamesPlayed +
            userData.wfHardGamesPlayed +
            Math.floor(userData.gkPracticeTotal / 10) // Approx GK sessions (10 questions per session)
          : 0;

        // Calculate level and progress to next level
        const currentXP = userData?.xp ?? 0;
        const currentLevel = userData ? getLevelForXP(currentXP) : 1;
        const nextLevelData = LEVELS.find((l) => l.level === currentLevel + 1);
        const currentLevelData = LEVELS.find((l) => l.level === currentLevel);
        
        let xpProgress = 0;
        let xpToNextLevel = 0;
        if (nextLevelData && currentLevelData) {
          const xpInCurrentLevel = currentXP - currentLevelData.xpRequired;
          const xpNeededForNextLevel = nextLevelData.xpRequired - currentLevelData.xpRequired;
          xpProgress = Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);
          xpToNextLevel = nextLevelData.xpRequired - currentXP;
        }

        // Determine last active timestamp
        const lastActiveAt = child.lastLoginAt || child.createdAt;

        return {
          _id: child._id,
          name: child.name,
          username: child.username,
          password: child.password, // Parent can always see
          role: child.role,
          createdAt: child.createdAt,
          lastLoginAt: child.lastLoginAt,
          // Stats from user data
          xp: currentXP,
          streak: userData?.streak ?? 0,
          level: currentLevel,
          hasPlayedToday: userData?.lastLoginDate === today,
          // New enhanced stats
          gamesPlayed,
          nextLevel: currentLevel + 1,
          xpProgress, // Percentage progress to next level (0-100)
          xpToNextLevel, // XP needed to reach next level
          lastActiveAt, // Timestamp for "last active" display
          lastLoginDate: userData?.lastLoginDate, // For activity calculations
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
        accuracy:
          userData.gkPracticeTotal > 0
            ? Math.round(
                (userData.gkPracticeCorrect / userData.gkPracticeTotal) * 100
              )
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

// Get recent activities for activity feed (derived from children's data)
export const getRecentActivities = query({
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

    const activities: Array<{
      id: string;
      childName: string;
      type: string;
      message: string;
      icon: string;
      timestamp: number;
      color: string;
    }> = [];

    const today = getISTDate();
    const todayDate = new Date(today);
    
    for (const child of children) {
      const userData = await ctx.db
        .query("users")
        .withIndex("by_child_id", (q) => q.eq("childId", child._id))
        .first();

      if (!userData) continue;

      // Check for streak achievements
      if (userData.streak >= 7) {
        activities.push({
          id: `${child._id}-streak-${userData.streak}`,
          childName: child.name,
          type: "streak",
          message: `has a 🔥 ${userData.streak}-day streak!`,
          icon: "flame",
          timestamp: child.lastLoginAt || Date.now(),
          color: "amber",
        });
      }

      // Check for level milestones (every 5 levels)
      const level = getLevelForXP(userData.xp);
      if (level >= 5 && level % 5 === 0) {
        activities.push({
          id: `${child._id}-level-${level}`,
          childName: child.name,
          type: "level_up",
          message: `reached Level ${level}! 🏆`,
          icon: "trophy",
          timestamp: child.lastLoginAt || Date.now(),
          color: "purple",
        });
      }

      // Check for XP milestones (every 1000 XP)
      if (userData.xp >= 1000 && userData.xp % 1000 < 100) {
        const milestone = Math.floor(userData.xp / 1000) * 1000;
        activities.push({
          id: `${child._id}-xp-${milestone}`,
          childName: child.name,
          type: "xp_milestone",
          message: `earned ${milestone.toLocaleString()}+ XP! 📈`,
          icon: "trending",
          timestamp: child.lastLoginAt || Date.now(),
          color: "indigo",
        });
      }

      // Check if played today
      if (userData.lastLoginDate === today) {
        activities.push({
          id: `${child._id}-played-today`,
          childName: child.name,
          type: "game_played",
          message: "is playing today 🎮",
          icon: "game",
          timestamp: child.lastLoginAt || Date.now(),
          color: "emerald",
        });
      }

      // Check for inactivity (3+ days without playing)
      if (userData.lastLoginDate) {
        const lastPlayed = new Date(userData.lastLoginDate);
        const diffDays = Math.floor((todayDate.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 3) {
          activities.push({
            id: `${child._id}-inactive-${diffDays}`,
            childName: child.name,
            type: "inactive",
            message: `hasn't played in ${diffDays} days`,
            icon: "alert",
            timestamp: lastPlayed.getTime(),
            color: "rose",
          });
        }
      }
    }

    // Sort by timestamp (most recent first) and limit to 10
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  },
});

// Update child name
export const updateChildName = mutation({
  args: {
    childId: v.id("children"),
    name: v.string(),
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

    const trimmedName = args.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      throw new Error("Name must be 1-50 characters");
    }

    // Update child name
    await ctx.db.patch(args.childId, { name: trimmedName });

    // Also update user data name if it exists
    const userData = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", args.childId))
      .first();

    if (userData) {
      await ctx.db.patch(userData._id, { name: trimmedName });
    }

    return { success: true, name: trimmedName };
  },
});
