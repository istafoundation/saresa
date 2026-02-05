import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Verify admin status (copied from levels.ts to keep migrations self-contained)
async function requireAdmin(ctx: any): Promise<Id<"parents">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Must be logged in");
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

/**
 * Migration: Add coins field to all existing users
 * 
 * Run this migration from the Convex dashboard:
 * 1. Go to Convex Dashboard > Functions
 * 2. Find this function under migrations > addCoinsToUsers
 * 3. Click "Run" to execute (must be logged in as admin)
 * 
 * This adds coins: 0 to all users that don't have the field.
 */
export const addCoinsToUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Require admin access
    await requireAdmin(ctx);
    
    // Get all users without coins field
    const users = await ctx.db.query("users").collect();
    
    let updated = 0;
    for (const user of users) {
      // Check if coins is undefined/missing
      if ((user as any).coins === undefined) {
        await ctx.db.patch(user._id, { coins: 0 });
        updated++;
      }
    }
    
    return { 
      total: users.length,
      updated,
      message: `Added coins=0 to ${updated} users`
    };
  },
});

/**
 * Migration: Remove old `isAppBlockingEnabled` field and migrate to `appBlockerEnabled`
 * 
 * Run this migration from the Convex dashboard:
 * 1. Go to Convex Dashboard > Functions
 * 2. Find this function under migrations > migrateAppBlockerField
 * 3. Click "Run" to execute
 * 
 * NOTE: No auth required - this is a one-time data migration
 */
export const migrateAppBlockerField = mutation({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("children").collect();
    
    let migratedCount = 0;
    for (const child of children) {
      const childDoc = child as any;
      if ('isAppBlockingEnabled' in childDoc) {
        // Copy old value to new field and remove old field
        await ctx.db.patch(child._id, {
          appBlockerEnabled: childDoc.isAppBlockingEnabled ?? false,
          isAppBlockingEnabled: undefined, // Removes the field
        } as any);
        migratedCount++;
      }
    }
    
    return { 
      total: children.length,
      migratedCount,
      message: `Migrated ${migratedCount} children from isAppBlockingEnabled to appBlockerEnabled`
    };
  },
});
