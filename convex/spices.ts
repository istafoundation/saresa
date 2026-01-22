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
      hindiName: s.hindiName,
    }));
  },
});

// Get random spices for a game session
export const getRandomSpices = query({
  args: { 
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const allSpices = await ctx.db
      .query("spices")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    // Shuffle using Fisher-Yates
    const shuffled = [...allSpices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return requested count
    const selected = shuffled.slice(0, Math.min(args.count, shuffled.length));
    
    return selected.map(s => ({
      id: s._id,
      name: s.name,
      imageUrl: s.imageUrl,
      hindiName: s.hindiName,
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
    hindiName: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const parentId = await requireAdmin(ctx);

    // Check for duplicate name
    const existing = await ctx.db
      .query("spices")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new ConvexError(`Spice "${args.name}" already exists`);
    }

    const now = Date.now();
    const id = await ctx.db.insert("spices", {
      name: args.name,
      imageUrl: args.imageUrl,
      hindiName: args.hindiName,
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
    hindiName: v.optional(v.string()),
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
    if (args.hindiName !== undefined) updates.hindiName = args.hindiName;
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
      hindiName: v.optional(v.string()),
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
        hindiName: spice.hindiName,
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
