"use node";
// Razorpay Actions (Node.js Runtime)
// This file contains actions that use the Razorpay SDK which requires Node.js
// Single plan at ₹351/month - discount code ISTA51 for ₹51 off

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { RAZORPAY_PLAN, getPlan } from "./lib/razorpay";
import Razorpay from "razorpay";

// Return type for subscription creation
interface SubscriptionResult {
  subscriptionId: string;
  shortUrl: string;
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
    callbackUrl: v.optional(v.string()), // URL to redirect after payment
  },
  handler: async (ctx, args): Promise<SubscriptionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    // Get parent and child
    const parent = await ctx.runQuery(internal.subscriptions.getParentByClerkId, {
      clerkId: identity.subject,
    });
    
    if (!parent) {
      throw new ConvexError("Parent not found");
    }
    
    const child = await ctx.runQuery(internal.subscriptions.getChildById, {
      childId: args.childId,
    });
    
    if (!child || child.parentId !== parent._id) {
      throw new ConvexError("Child not found or unauthorized");
    }
    
    // Get plan details (single plan now)
    const plan = getPlan();
    
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
    
    // Create subscription on Razorpay with callback URL for redirect after payment
    const subscriptionOptions: any = {
      plan_id: plan.planId,
      customer_notify: 1,
      total_count: 12, // 12 months max
      notes: {
        childId: args.childId,
        parentId: parent._id,
      },
    };
    
    // Add callback URL if provided (for redirect after payment)
    if (args.callbackUrl) {
      subscriptionOptions.notify_info = {
        redirect_url: args.callbackUrl,
      };
    }
    
    const subscription = await razorpay.subscriptions.create(subscriptionOptions);
    
    // Store subscription in database
    await ctx.runMutation(internal.subscriptions.storeSubscription, {
      childId: args.childId,
      parentId: parent._id,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: plan.planId,
      razorpayCustomerId: customerId,
      amount: plan.amount,
      status: "created",
    });
    
    // Return subscription ID and short URL for checkout
    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
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
      throw new ConvexError("Not authenticated");
    }
    
    // Get current subscription
    const subscription = await ctx.runQuery(internal.subscriptions.getActiveSubscription, {
      childId: args.childId,
    });
    
    if (!subscription) {
      throw new ConvexError("No active subscription found");
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
