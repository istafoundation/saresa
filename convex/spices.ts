// Spices management for Let'em Cook game
// Admin CRUD operations + game queries
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================
// HELPER: Admin verification
// ============================================

async function requireAdmin(ctx: any): Promise<Id<"parents">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!parent) {
    throw new ConvexError("Parent account not found");
  }

  return parent._id;
}

// ============================================
// GAME QUERIES (Public - for mobile app)
// ============================================

// Get all enabled spices for the game
export const getEnabledSpices = query({
  args: {},
  handler: async (ctx) => {
    const spices = await ctx.db
      .query("spices")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    return spices.map(s => ({
      id: s._id,
      name: s.name,
      imageUrl: s.imageUrl,
    }));
  },
});

// Seeded random number generator for deterministic shuffling
// Uses Linear Congruential Generator (LCG)
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// Get today's date in IST as a seed number
function getDateSeed(): number {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  // Create seed from date components (same seed for entire day)
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  return year * 10000 + month * 100 + day;
}

// Get random spices for a game session
// OPTIMIZED: Uses seeded random based on IST date for deterministic results
// This prevents query re-evaluation from returning different spices
export const getRandomSpices = query({
  args: { 
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const allSpices = await ctx.db
      .query("spices")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    // Use seeded random for deterministic shuffling
    // Same date = same shuffle order = consistent results per day
    const dateSeed = getDateSeed();
    const random = seededRandom(dateSeed);

    // Shuffle using Fisher-Yates with seeded random
    const shuffled = [...allSpices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return requested count
    const selected = shuffled.slice(0, Math.min(args.count, shuffled.length));
    
    return selected.map(s => ({
      id: s._id,
      name: s.name,
      imageUrl: s.imageUrl,
    }));
  },
});

// Get total count of enabled spices
export const getSpiceCount = query({
  args: {},
  handler: async (ctx) => {
    const spices = await ctx.db
      .query("spices")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
    return spices.length;
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

// Get all spices for admin management
export const getAllSpices = query({
  args: {},
  handler: async (ctx) => {
    // Verify admin
    await requireAdmin(ctx);

    const spices = await ctx.db.query("spices").collect();
    return spices.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get spice stats
export const getSpiceStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const all = await ctx.db.query("spices").collect();
    const enabled = all.filter(s => s.isEnabled);

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: all.length - enabled.length,
    };
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

// Add a new spice
export const addSpice = mutation({
  args: {
    name: v.string(),
    imageUrl: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const parentId = await requireAdmin(ctx);

    // Check for duplicate name using index
    const existing = await ctx.db
      .query("spices")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new ConvexError(`Spice "${args.name}" already exists`);
    }

    const now = Date.now();
    const id = await ctx.db.insert("spices", {
      name: args.name,
      imageUrl: args.imageUrl,
      description: args.description,
      isEnabled: args.isEnabled,
      createdBy: parentId,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

// Update a spice
export const updateSpice = mutation({
  args: {
    id: v.id("spices"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const spice = await ctx.db.get(args.id);
    if (!spice) {
      throw new ConvexError("Spice not found");
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isEnabled !== undefined) updates.isEnabled = args.isEnabled;

    await ctx.db.patch(args.id, updates);

    return { success: true };
  },
});

// Delete a spice
export const deleteSpice = mutation({
  args: {
    id: v.id("spices"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const spice = await ctx.db.get(args.id);
    if (!spice) {
      throw new ConvexError("Spice not found");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Toggle spice enabled status
export const toggleSpice = mutation({
  args: {
    id: v.id("spices"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const spice = await ctx.db.get(args.id);
    if (!spice) {
      throw new ConvexError("Spice not found");
    }

    await ctx.db.patch(args.id, {
      isEnabled: !spice.isEnabled,
      updatedAt: Date.now(),
    });

    return { isEnabled: !spice.isEnabled };
  },
});

// Bulk replace spices (Sync Mode for CSV Upload)
export const bulkReplaceSpices = mutation({
  args: {
    spices: v.array(v.object({
      name: v.string(),
      imageUrl: v.string(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const parentId = await requireAdmin(ctx);
    const now = Date.now();

    // Delete all existing spices
    // Note: This is a heavy operation if there are many spices, but standard for "sync" mode
    const allSpices = await ctx.db.query("spices").collect();
    for (const spice of allSpices) {
      await ctx.db.delete(spice._id);
    }

    let imported = 0;

    // Insert new spices
    for (const spice of args.spices) {
      await ctx.db.insert("spices", {
        name: spice.name,
        imageUrl: spice.imageUrl,
        description: spice.description,
        isEnabled: true,
        createdBy: parentId,
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    return { imported };
  },
});

// ============================================
// LET'EM COOK SETTINGS
// ============================================

const DEFAULT_QUESTIONS_PER_GAME = 1;
const SPICES_PER_QUESTION = 4;

// Get Let'em Cook game settings
export const getLetEmCookSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("gameSettings")
      .withIndex("by_game", (q) => q.eq("gameId", "let-em-cook"))
      .first();

    return {
      questionsPerGame: settings?.lecQuestionsPerGame ?? DEFAULT_QUESTIONS_PER_GAME,
      spicesPerQuestion: SPICES_PER_QUESTION,
    };
  },
});

// Get settings (admin only - includes more details)
export const getLetEmCookSettingsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const settings = await ctx.db
      .query("gameSettings")
      .withIndex("by_game", (q) => q.eq("gameId", "let-em-cook"))
      .first();

    return {
      questionsPerGame: settings?.lecQuestionsPerGame ?? DEFAULT_QUESTIONS_PER_GAME,
      spicesPerQuestion: SPICES_PER_QUESTION,
      updatedAt: settings?.updatedAt,
    };
  },
});

// Update Let'em Cook settings (admin only)
export const updateLetEmCookSettings = mutation({
  args: {
    questionsPerGame: v.number(),
  },
  handler: async (ctx, args) => {
    const parentId = await requireAdmin(ctx);

    if (args.questionsPerGame < 1 || args.questionsPerGame > 20) {
      throw new ConvexError("Questions per game must be between 1 and 20");
    }

    const existing = await ctx.db
      .query("gameSettings")
      .withIndex("by_game", (q) => q.eq("gameId", "let-em-cook"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lecQuestionsPerGame: args.questionsPerGame,
        updatedBy: parentId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameSettings", {
        gameId: "let-em-cook",
        lecQuestionsPerGame: args.questionsPerGame,
        updatedBy: parentId,
        updatedAt: Date.now(),
      });
    }

    return { success: true, questionsPerGame: args.questionsPerGame };
  },
});

