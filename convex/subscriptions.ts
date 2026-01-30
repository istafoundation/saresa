// Subscription Queries and Mutations (Default Convex Runtime)
import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

// Get subscription status for a child (used by mobile app)
export const getChildSubscription = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .order("desc")
      .first();
    
    if (!subscription) {
      return null;
    }
    
    return {
      status: subscription.status,
      planGroup: subscription.planGroup,
      amount: subscription.amount,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isActive: subscription.status === "active" || subscription.status === "authenticated",
    };
  },
});

// Get all subscriptions for a parent
export const getParentSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!parent) {
      return [];
    }
    
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
      .collect();
    
    // Enrich with child data
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const child = await ctx.db.get(sub.childId);
        return {
          ...sub,
          childName: child?.name || "Unknown",
        };
      })
    );
    
    return enrichedSubscriptions;
  },
});

// Get payment history for a child
export const getPaymentHistory = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    // Verify parent owns this child
    const parent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!parent) {
      throw new ConvexError("Parent not found");
    }
    
    const child = await ctx.db.get(args.childId);
    if (!child || child.parentId !== parent._id) {
      throw new ConvexError("Child not found or unauthorized");
    }
    
    const payments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .order("desc")
      .collect();
    
    return payments;
  },
});

// ============================================
// INTERNAL MUTATIONS (for webhooks and actions)
// ============================================

export const storeSubscription = internalMutation({
  args: {
    childId: v.id("children"),
    parentId: v.id("parents"),
    razorpaySubscriptionId: v.string(),
    razorpayPlanId: v.string(),
    razorpayCustomerId: v.optional(v.string()),
    amount: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("subscriptions", {
      childId: args.childId,
      parentId: args.parentId,
      razorpaySubscriptionId: args.razorpaySubscriptionId,
      razorpayPlanId: args.razorpayPlanId,
      razorpayCustomerId: args.razorpayCustomerId,
      amount: args.amount,
      status: args.status as "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSubscriptionStatus = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    status: v.string(),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: args.status as "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired",
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });
  },
});

export const updateSubscriptionByRazorpayId = internalMutation({
  args: {
    razorpaySubscriptionId: v.string(),
    status: v.string(),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_razorpay_id", (q) => q.eq("razorpaySubscriptionId", args.razorpaySubscriptionId))
      .first();
    
    if (!subscription) {
      console.error("Subscription not found:", args.razorpaySubscriptionId);
      return;
    }
    
    await ctx.db.patch(subscription._id, {
      status: args.status as "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired",
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });
  },
});

export const recordPayment = internalMutation({
  args: {
    razorpaySubscriptionId: v.string(),
    razorpayPaymentId: v.string(),
    razorpayInvoiceId: v.optional(v.string()),
    amount: v.number(),
    status: v.union(v.literal("captured"), v.literal("failed"), v.literal("refunded")),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_razorpay_id", (q) => q.eq("razorpaySubscriptionId", args.razorpaySubscriptionId))
      .first();
    
    if (!subscription) {
      console.error("Subscription not found for payment:", args.razorpaySubscriptionId);
      return;
    }
    
    await ctx.db.insert("subscriptionPayments", {
      subscriptionId: subscription._id,
      childId: subscription.childId,
      parentId: subscription.parentId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpayInvoiceId: args.razorpayInvoiceId,
      amount: args.amount,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL QUERIES (for actions)
// ============================================

export const getParentByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parents")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getChildById = internalQuery({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.childId);
  },
});

export const getActiveSubscription = internalQuery({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "authenticated")
        )
      )
      .first();
  },
});
