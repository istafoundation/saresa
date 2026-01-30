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
    offerId: v.optional(v.string()), // Optional offer ID for discounts
    couponCode: v.optional(v.string()), // NEW: Coupon code support
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

    // Resolve Coupon if provided
    let appliedOfferId = args.offerId;
    let finalAmount: number = getPlan().amount;
    let appliedCouponCode = args.couponCode;

    if (args.couponCode) {
      const coupon = await ctx.runQuery(internal.coupons.getCouponInternal, {
        code: args.couponCode,
      });

      if (!coupon) {
        throw new ConvexError("Invalid coupon code");
      }
      if (!coupon.isActive) {
        throw new ConvexError("Coupon is inactive");
      }
      if (coupon.expiryDate && Date.now() > coupon.expiryDate) {
        throw new ConvexError("Coupon has expired");
      }
      if (coupon.maxTotalUses && coupon.usageCount >= coupon.maxTotalUses) {
        throw new ConvexError("Coupon usage limit exceeded");
      }

      if (coupon.razorpayOfferId) {
        appliedOfferId = coupon.razorpayOfferId;
      }
      
      // Calculate amount for return value (assuming offer is valid)
      // Note: Razorpay handles the actual charging, but we want to return expected amount
      if (coupon.discountType === "flat") {
          finalAmount = Math.max(0, finalAmount - coupon.discountAmount);
      } else {
           // Percentage logic if needed
      }
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
        couponCode: appliedCouponCode,
      },
    };
    
    // Add callback URL if provided (for redirect after payment)
    if (args.callbackUrl) {
      subscriptionOptions.notify_info = {
        redirect_url: args.callbackUrl,
      };
    }

    // Add offer_id if provided (for discounts)
    if (appliedOfferId) {
      subscriptionOptions.offer_id = appliedOfferId;
    }
    
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create(subscriptionOptions);
    } catch (err: any) {
      console.error("Razorpay Subscription Create Error:", JSON.stringify(err, null, 2));
      throw new ConvexError(err.error?.description || err.message || "Failed to initiate subscription with payment provider");
    }

    // Increment coupon usage if successful
    if (appliedCouponCode) {
        await ctx.runMutation(internal.coupons.incrementCouponUsage, { code: appliedCouponCode });
    }
    
    // Store subscription in database
    await ctx.runMutation(internal.subscriptions.storeSubscription, {
      childId: args.childId,
      parentId: parent._id,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: plan.planId,
      razorpayCustomerId: customerId,
      amount: plan.amount, // Storing original amount or discounted? Usually original plan amount, but maybe tracked payment will show real amount
      status: "created",
      couponCode: appliedCouponCode,
    });
    
    // Return subscription ID and short URL for checkout
    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      amount: finalAmount, 
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
