"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Create a coupon with an optional Razorpay Offer ID.
 * 
 * IMPORTANT: Razorpay subscription offers CANNOT be created via API.
 * Admins must create offers in Razorpay Dashboard first, then link them here.
 * 
 * Steps for Razorpay-linked coupons:
 * 1. Go to Razorpay Dashboard → Subscriptions → Offers
 * 2. Create offer with discount type, applicable plans, etc.
 * 3. Copy the generated offer_id (e.g., "offer_xxx")
 * 4. Use that ID when creating the coupon here
 */
export const createCoupon = action({
  args: {
    code: v.string(),
    discountType: v.union(v.literal("flat"), v.literal("percentage")),
    discountAmount: v.number(), // in paise for flat, percentage value for percentage
    description: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    maxTotalUses: v.optional(v.number()),
    razorpayOfferId: v.optional(v.string()), // Pre-created in Razorpay Dashboard
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if code already exists
    const existing = await ctx.runQuery(internal.coupons.getCouponInternal, { code: args.code });
    if (existing) {
      throw new ConvexError(`Coupon code '${args.code}' already exists`);
    }

    // Validate razorpayOfferId format if provided
    if (args.razorpayOfferId && !args.razorpayOfferId.startsWith("offer_")) {
      throw new ConvexError("Invalid Razorpay Offer ID format. It should start with 'offer_'");
    }

    // Store coupon in database
    await ctx.runMutation(internal.coupons.createCouponInternal, {
      code: args.code,
      razorpayOfferId: args.razorpayOfferId, // Optional link to Razorpay
      discountType: args.discountType,
      discountAmount: args.discountAmount,
      description: args.description,
      expiryDate: args.expiryDate,
      maxTotalUses: args.maxTotalUses,
    });
  },
});
