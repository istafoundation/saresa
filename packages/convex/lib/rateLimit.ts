/**
 * Rate Limiting Utility for Convex Backend
 * Provides per-user rate limiting with admin notifications
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

// Rate limit configuration per action
export const RATE_LIMITS = {
  // Login: 5 attempts per 5 minutes (brute force protection)
  login: { max: 5, windowMs: 5 * 60 * 1000, windowMinutes: 5 },
  
  // XP/Currency mutations: 20 per minute (prevents farming exploits)
  addXP: { max: 20, windowMs: 60 * 1000, windowMinutes: 1 },
  updateCoins: { max: 20, windowMs: 60 * 1000, windowMinutes: 1 },
  addCoins: { max: 20, windowMs: 60 * 1000, windowMinutes: 1 },
  
  // Game completions: 30 per minute (generous for normal play)
  finishGame: { max: 30, windowMs: 60 * 1000, windowMinutes: 1 },
  
  // General mutations: 100 per minute per user
  mutation: { max: 100, windowMs: 60 * 1000, windowMinutes: 1 },
  
  // Username checks: 20 per minute (prevents enumeration)
  checkUsername: { max: 20, windowMs: 60 * 1000, windowMinutes: 1 },
};

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Rate limit error message shown to users
 */
export const RATE_LIMIT_ERROR = "You are rate limited. Please try again after 5 mins. If this issue persists please contact support.";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and enforce rate limit for an action
 * 
 * @param ctx - Mutation context
 * @param action - The action being rate limited
 * @param identifier - Unique identifier (username for login, childId for others)
 * @param childId - Optional child ID for authenticated requests
 * @param childName - Optional child name for notifications
 * @param username - Optional username for notifications
 * @returns RateLimitResult
 * @throws ConvexError if rate limit exceeded
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  action: RateLimitAction,
  identifier: string,
  childId?: Id<"children">,
  childName?: string,
  username?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Find existing rate limit record for this identifier and action
  const existingRecord = await ctx.db
    .query("rateLimitEvents")
    .withIndex("by_identifier_action", (q) => 
      q.eq("identifier", identifier).eq("action", action)
    )
    .first();

  let count = 1;
  
  if (existingRecord) {
    // Check if we're still in the same window
    if (existingRecord.windowStart > windowStart) {
      // Same window - increment count
      count = existingRecord.count + 1;
      
      // Check if limit exceeded
      if (count > config.max) {
        // Record the rate limit violation for admin notification
        await recordRateLimitViolation(
          ctx,
          action,
          config.max,
          count,
          config.windowMinutes,
          childId,
          childName,
          username
        );
        
        // Use structured error format for proper client extraction
        throw new ConvexError({
          type: "RATE_LIMIT",
          message: "Too many login attempts. Please try again after 5 minutes.",
          retryAfterMinutes: config.windowMinutes,
        });
      }
      
      // Update the count
      await ctx.db.patch(existingRecord._id, {
        count,
        timestamp: now,
      });
    } else {
      // New window - reset count
      await ctx.db.patch(existingRecord._id, {
        count: 1,
        timestamp: now,
        windowStart: now,
      });
    }
  } else {
    // Create new record
    await ctx.db.insert("rateLimitEvents", {
      childId: childId ?? undefined,
      action,
      identifier,
      timestamp: now,
      windowStart: now,
      count: 1,
    });
  }

  return {
    allowed: true,
    remaining: config.max - count,
    resetAt: (existingRecord?.windowStart ?? now) + config.windowMs,
  };
}

/**
 * Record a rate limit violation for the admin dashboard
 */
async function recordRateLimitViolation(
  ctx: MutationCtx,
  action: string,
  limit: number,
  count: number,
  windowMinutes: number,
  childId?: Id<"children">,
  childName?: string,
  username?: string
): Promise<void> {
  // Check if we already have a recent notification for this user/action (within 5 minutes)
  // to avoid spamming the admin dashboard
  const recentNotification = await ctx.db
    .query("rateLimitNotifications")
    .withIndex("by_created", (q) => q.gt("createdAt", Date.now() - 5 * 60 * 1000))
    .filter((q) => 
      q.and(
        q.eq(q.field("action"), action),
        childId 
          ? q.eq(q.field("childId"), childId)
          : q.eq(q.field("username"), username)
      )
    )
    .first();

  if (recentNotification) {
    // Update the existing notification with the latest count
    await ctx.db.patch(recentNotification._id, {
      count,
      createdAt: Date.now(),
    });
  } else {
    // Create new notification
    await ctx.db.insert("rateLimitNotifications", {
      childId: childId ?? undefined,
      childName: childName ?? undefined,
      username: username ?? undefined,
      action,
      limit,
      count,
      windowMinutes,
      createdAt: Date.now(),
      isRead: false,
    });
  }
}

/**
 * Clean up old rate limit events (call periodically via cron)
 * Removes events older than 1 hour
 */
export async function cleanupOldRateLimitEvents(ctx: MutationCtx): Promise<{ deleted: number }> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  const oldEvents = await ctx.db
    .query("rateLimitEvents")
    .withIndex("by_timestamp", (q) => q.lt("timestamp", oneHourAgo))
    .collect();

  for (const event of oldEvents) {
    await ctx.db.delete(event._id);
  }

  return { deleted: oldEvents.length };
}
