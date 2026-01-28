/**
 * Admin Dashboard Functions for User Management & Security Monitoring
 */
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Verify admin status - helper function
 */
async function requireAdmin(ctx: any): Promise<Id<"parents">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!parent || parent.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return parent._id;
}

// ============================================
// RATE LIMIT NOTIFICATIONS
// ============================================

/**
 * Get rate limit notifications for admin dashboard
 * Returns recent violations sorted by newest first
 */
export const getRateLimitNotifications = query({
  args: {
    limit: v.optional(v.number()),
    showRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 50;
    
    let notificationsQuery = ctx.db
      .query("rateLimitNotifications")
      .withIndex("by_created")
      .order("desc");

    // Filter by read status if specified
    if (args.showRead === false) {
      notificationsQuery = ctx.db
        .query("rateLimitNotifications")
        .withIndex("by_read", (q) => q.eq("isRead", false))
        .order("desc");
    }

    const notifications = await notificationsQuery.take(limit);

    // Enrich with child data if available
    return Promise.all(notifications.map(async (notification) => {
      let child = null;
      let parent = null;
      
      if (notification.childId) {
        child = await ctx.db.get(notification.childId);
        if (child) {
          parent = await ctx.db.get(child.parentId);
        }
      }

      return {
        ...notification,
        childDetails: child ? {
          name: child.name,
          username: child.username,
          parentName: parent?.name ?? "Unknown",
          parentEmail: parent?.email ?? "",
        } : null,
      };
    }));
  },
});

/**
 * Get count of unread rate limit notifications
 */
export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const unread = await ctx.db
      .query("rateLimitNotifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();

    return { count: unread.length };
  },
});

/**
 * Mark notification as read
 */
export const markNotificationRead = mutation({
  args: { notificationId: v.id("rateLimitNotifications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.notificationId, { isRead: true });
    return { success: true };
  },
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const unread = await ctx.db
      .query("rateLimitNotifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { success: true, count: unread.length };
  },
});

/**
 * Clear old notifications (older than 7 days)
 */
export const clearOldNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const oldNotifications = await ctx.db
      .query("rateLimitNotifications")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), sevenDaysAgo))
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { success: true, deleted: oldNotifications.length };
  },
});

// ============================================
// SECURITY OVERVIEW
// ============================================

/**
 * Get security overview statistics
 */
export const getSecurityOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent rate limit violations
    const recentViolations = await ctx.db
      .query("rateLimitNotifications")
      .withIndex("by_created", (q) => q.gt("createdAt", oneDayAgo))
      .collect();

    // Get recent rate limit events
    const recentEvents = await ctx.db
      .query("rateLimitEvents")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneHourAgo))
      .collect();

    // Group violations by action
    const violationsByAction: Record<string, number> = {};
    for (const v of recentViolations) {
      violationsByAction[v.action] = (violationsByAction[v.action] ?? 0) + 1;
    }

    // Get unique users who hit rate limits today
    const uniqueUsers = new Set(
      recentViolations.filter(v => v.childId).map(v => v.childId?.toString())
    );

    return {
      violations24h: recentViolations.length,
      uniqueUsersAffected: uniqueUsers.size,
      violationsByAction,
      activeRateLimitEvents: recentEvents.length,
      unreadNotifications: recentViolations.filter(v => !v.isRead).length,
    };
  },
});

/**
 * Clear specific tables for data sync
 * WARNING: Destructive operation.
 */
export const clearTables = mutation({
  args: {
    tableNames: v.array(v.string()),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require Admin Auth
    await requireAdmin(ctx);

    const deletedCounts: Record<string, number> = {};

    for (const tableName of args.tableNames) {
      // @ts-ignore - dynamic table access
      const documents = await ctx.db.query(tableName).collect();
      
      deletedCounts[tableName] = documents.length;
      
      for (const doc of documents) {
        await ctx.db.delete(doc._id);
      }
    }

    return { success: true, deleted: deletedCounts };
  },
});
