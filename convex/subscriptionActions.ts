"use node";
// Razorpay Actions (Node.js Runtime)
// This file contains actions that use the Razorpay SDK which requires Node.js

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { RAZORPAY_PLANS, getPlanByGroup } from "./lib/razorpay";
import Razorpay from "razorpay";
import type { Id } from "./_generated/dataModel";

// Return type for subscription creation
interface SubscriptionResult {
  subscriptionId: string;
  shortUrl: string;
  planGroup: "A" | "B" | "C";
  amount: number;
}

// Create Razorpay instance
function getRazorpayInstance(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

// Create a new subscription
export const createSubscription = action({
  args: {
    childId: v.id("children"),
    planGroup: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
  },
  handler: async (ctx, args): Promise<SubscriptionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get parent and child
    const parent = await ctx.runQuery(internal.subscriptions.getParentByClerkId, {
      clerkId: identity.subject,
    });
    
    if (!parent) {
      throw new Error("Parent not found");
    }
    
    const child = await ctx.runQuery(internal.subscriptions.getChildById, {
      childId: args.childId,
    });
    
    if (!child || child.parentId !== parent._id) {
      throw new Error("Child not found or unauthorized");
    }
    
    // Get plan details
    const plan = getPlanByGroup(args.planGroup);
    
    // Create Razorpay subscription
    const razorpay = getRazorpayInstance();
    
    // Create or get customer
    let customerId: string | undefined;
    try {
      const customer = await razorpay.customers.create({
        name: parent.name,
        email: parent.email,
        notes: {
          parentId: parent._id,
          childId: args.childId,
        },
      });
      customerId = customer.id;
    } catch (error) {
      console.error("Failed to create customer:", error);
      // Continue without customer ID
    }
    
    // Create subscription on Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,
      customer_notify: 1,
      total_count: 12, // 12 months max
      notes: {
        childId: args.childId,
        parentId: parent._id,
        planGroup: args.planGroup,
      },
    });
    
    // Store subscription in database
    await ctx.runMutation(internal.subscriptions.storeSubscription, {
      childId: args.childId,
      parentId: parent._id,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: plan.planId,
      razorpayCustomerId: customerId,
      planGroup: args.planGroup,
      amount: plan.amount,
      status: "created",
    });
    
    // Return subscription ID and short URL for checkout
    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      planGroup: args.planGroup,
      amount: plan.amount,
    };
  },
});

// Cancel subscription
export const cancelSubscription = action({
  args: { childId: v.id("children") },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get current subscription
    const subscription = await ctx.runQuery(internal.subscriptions.getActiveSubscription, {
      childId: args.childId,
    });
    
    if (!subscription) {
      throw new Error("No active subscription found");
    }
    
    // Cancel on Razorpay
    const razorpay = getRazorpayInstance();
    await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
    
    // Update in database
    await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
      subscriptionId: subscription._id,
      status: "cancelled",
    });
    
    return { success: true };
  },
});

// Change plan (cancel old + create new)
export const changePlan = action({
  args: {
    childId: v.id("children"),
    newPlanGroup: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
  },
  handler: async (ctx, args): Promise<SubscriptionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Check for existing active subscription and cancel it
    const existingSubscription = await ctx.runQuery(internal.subscriptions.getActiveSubscription, {
      childId: args.childId,
    });
    
    if (existingSubscription) {
      // Cancel on Razorpay
      const razorpay = getRazorpayInstance();
      try {
        await razorpay.subscriptions.cancel(existingSubscription.razorpaySubscriptionId);
      } catch (error) {
        console.error("Failed to cancel existing subscription:", error);
      }
      
      // Update status in database
      await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
        subscriptionId: existingSubscription._id,
        status: "cancelled",
      });
    }
    
    // Create new subscription
    const parent = await ctx.runQuery(internal.subscriptions.getParentByClerkId, {
      clerkId: identity.subject,
    });
    
    if (!parent) {
      throw new Error("Parent not found");
    }
    
    const child = await ctx.runQuery(internal.subscriptions.getChildById, {
      childId: args.childId,
    });
    
    if (!child || child.parentId !== parent._id) {
      throw new Error("Child not found or unauthorized");
    }
    
    // Get plan details
    const plan = getPlanByGroup(args.newPlanGroup);
    
    // Create Razorpay subscription
    const razorpay = getRazorpayInstance();
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,
      customer_notify: 1,
      total_count: 12,
      notes: {
        childId: args.childId,
        parentId: parent._id,
        planGroup: args.newPlanGroup,
      },
    });
    
    // Store subscription in database
    await ctx.runMutation(internal.subscriptions.storeSubscription, {
      childId: args.childId,
      parentId: parent._id,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: plan.planId,
      planGroup: args.newPlanGroup,
      amount: plan.amount,
      status: "created",
    });
    
    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      planGroup: args.newPlanGroup,
      amount: plan.amount,
    };
  },
});
