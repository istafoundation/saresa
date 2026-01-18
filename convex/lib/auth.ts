/**
 * Shared authentication utilities for Convex backend
 * Consolidates session validation to avoid duplication
 */
import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Get childId from session token
 * This validates the session and returns the associated child ID
 * 
 * @param ctx - Convex query or mutation context
 * @param token - Session token from client
 * @returns Child ID if valid, null otherwise
 */
export async function getChildIdFromSession(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Id<"children"> | null> {
  if (!token) return null;

  const session = await ctx.db
    .query("childSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) return null;
  return session.childId;
}

/**
 * Wrapper type for auth context
 */
export interface AuthResult {
  childId: Id<"children">;
}

/**
 * Require authentication - throws if not authenticated
 * Use this to guard mutations/queries that require auth
 * 
 * @param ctx - Convex query or mutation context
 * @param token - Session token from client
 * @returns Auth result with childId
 * @throws Error if not authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<AuthResult> {
  const childId = await getChildIdFromSession(ctx, token);
  if (!childId) {
    throw new Error("Not authenticated");
  }
  return { childId };
}

/**
 * Get user document for authenticated child
 * Convenience function that does auth + user lookup in one call
 * 
 * @param ctx - Convex query or mutation context
 * @param token - Session token from client
 * @returns User document or null if not found
 * @throws Error if not authenticated
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
  token: string
) {
  const { childId } = await requireAuth(ctx, token);
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_child_id", (q) => q.eq("childId", childId))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return { childId, user };
}
