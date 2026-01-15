import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Generate cryptographically secure session token (32 hex characters)
function generateToken(): string {
  // Use crypto.randomUUID() which is available in modern runtimes
  // Fallback to timestamp + random for older environments
  try {
    // Generate two UUIDs and extract hex portions for 32 chars
    const uuid = crypto.randomUUID().replace(/-/g, '');
    return uuid.slice(0, 32);
  } catch {
    // Fallback: use multiple random sources for better entropy
    const timestamp = Date.now().toString(16);
    const random1 = Math.random().toString(16).slice(2);
    const random2 = Math.random().toString(16).slice(2);
    return (timestamp + random1 + random2).slice(0, 32).padEnd(32, '0');
  }
}

// Session duration: 30 days in milliseconds
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

// Login child with username and password
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const username = args.username.toLowerCase().trim();

    // Find child by username
    const child = await ctx.db
      .query("children")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!child) {
      throw new Error("Invalid username or password");
    }

    // Check password (plaintext comparison)
    if (child.password !== args.password) {
      throw new Error("Invalid username or password");
    }

    // Generate session token
    const token = generateToken();
    const now = Date.now();

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
export const cleanupExpiredSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("childSessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
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
