import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { checkRateLimit, RATE_LIMIT_ERROR } from "./lib/rateLimit";

// Generate cryptographically secure session token (32 hex characters)
function generateToken(): string {
  // Use crypto.getRandomValues which is always available in Convex
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Session duration: 30 days in milliseconds
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

// Maximum sessions per child account
const MAX_SESSIONS_PER_CHILD = 5;

// Login child with username and password
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const username = args.username.toLowerCase().trim();

    // Rate limit: 5 login attempts per 5 minutes per username
    await checkRateLimit(ctx, "login", username, undefined, undefined, username);

    // Find child by username
    const child = await ctx.db
      .query("children")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!child) {
      throw new ConvexError("Invalid username or password");
    }

    // Check password (plaintext comparison - TODO: implement encryption)
    if (child.password !== args.password) {
      throw new ConvexError("Invalid username or password");
    }

    // Generate session token
    const token = generateToken();
    const now = Date.now();

    // Enforce session limit: max 5 sessions per child
    const existingSessions = await ctx.db
      .query("childSessions")
      .withIndex("by_child", (q) => q.eq("childId", child._id))
      .collect();

    if (existingSessions.length >= MAX_SESSIONS_PER_CHILD) {
      // Delete oldest sessions to make room
      const sortedSessions = existingSessions.sort((a, b) => a.createdAt - b.createdAt);
      const sessionsToDelete = sortedSessions.slice(0, existingSessions.length - MAX_SESSIONS_PER_CHILD + 1);
      for (const session of sessionsToDelete) {
        await ctx.db.delete(session._id);
      }
    }

    // Create session
    await ctx.db.insert("childSessions", {
      childId: child._id,
      token,
      expiresAt: now + SESSION_DURATION,
      createdAt: now,
    });

    // Update last login
    await ctx.db.patch(child._id, {
      lastLoginAt: now,
    });

    return {
      success: true,
      token,
      child: {
        id: child._id,
        name: child.name,
        username: child.username,
        role: child.role,
      },
    };
  },
});

// Validate session token - returns child data if valid
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) return null;

    // Check expiry
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const child = await ctx.db.get(session.childId);
    if (!child) return null;

    return {
      valid: true,
      childId: child._id,
      name: child.name,
      username: child.username,
      role: child.role,
    };
  },
});

// Logout - invalidate session
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Clean up expired sessions (called by cron job)
// Uses by_expires_at index for efficient O(log n) queries
export const cleanupExpiredSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    // Use index for efficient querying of expired sessions
    const expiredSessions = await ctx.db
      .query("childSessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});

// Get child from session (internal helper used by other mutations)
export const getChildFromSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    return await ctx.db.get(session.childId);
  },
});

// Check if child has user data (completed onboarding)
export const checkChildUserExists = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return { exists: false, signedIn: false };

    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { exists: false, signedIn: false };
    }

    const child = await ctx.db.get(session.childId);
    if (!child) return { exists: false, signedIn: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_child_id", (q) => q.eq("childId", child._id))
      .first();

    return {
      exists: !!user,
      signedIn: true,
      childId: child._id,
      childName: child.name,
      userData: user || null,
    };
  },
});
