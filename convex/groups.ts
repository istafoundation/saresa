import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { checkRateLimit } from "./lib/rateLimit";

// ============================================
// ADMIN QUERIES
// ============================================

export const getGroups = query({
  args: {},
  handler: async (ctx) => {
    // Determine if admin (optional for reading? No, let's keep it open for now or check auth)
    // Mobile app needs to read groups too.

    const groups = await ctx.db
      .query("levelGroups")
      .withIndex("by_order")
      .collect();

    return groups;
  },
});

export const getGroup = query({
  args: { groupId: v.id("levelGroups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.groupId);
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Must be logged in");

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!parent || parent.role !== "admin") {
    throw new ConvexError("Admin access required");
  }
  return parent;
}

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    theme: v.optional(
      v.object({
        primaryColor: v.string(),
        secondaryColor: v.optional(v.string()),
        backgroundImage: v.optional(v.string()),
        emoji: v.optional(v.string()),
      }),
    ),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const groups = await ctx.db.query("levelGroups").collect();
    const nextOrder =
      groups.length > 0 ? Math.max(...groups.map((g) => g.order)) + 1 : 1;

    const groupId = await ctx.db.insert("levelGroups", {
      name: args.name,
      description: args.description,
      order: nextOrder,
      theme: args.theme,
      isEnabled: args.isEnabled,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return groupId;
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("levelGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    theme: v.optional(
      v.object({
        primaryColor: v.string(),
        secondaryColor: v.optional(v.string()),
        backgroundImage: v.optional(v.string()),
        emoji: v.optional(v.string()),
      }),
    ),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { groupId, ...updates } = args;
    await ctx.db.patch(groupId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteGroup = mutation({
  args: { groupId: v.id("levelGroups") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if group has levels
    const levels = await ctx.db
      .query("levels")
      .withIndex("by_group_level", (q) => q.eq("groupId", args.groupId))
      .first();

    if (levels) {
      throw new ConvexError(
        "Cannot delete group with levels. Move levels first.",
      );
    }

    await ctx.db.delete(args.groupId);
  },
});

export const reorderGroups = mutation({
  args: {
    groupId: v.id("levelGroups"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const groups = await ctx.db
      .query("levelGroups")
      .withIndex("by_order")
      .collect();
    const currentIndex = groups.findIndex((g) => g._id === args.groupId);

    if (currentIndex === -1) return;

    const targetIndex =
      args.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;

    // Swap order
    const currentGroup = groups[currentIndex];
    const targetGroup = groups[targetIndex];

    const tempOrder = currentGroup.order;
    await ctx.db.patch(currentGroup._id, { order: targetGroup.order });
    await ctx.db.patch(targetGroup._id, { order: tempOrder });
  },
});
