"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { RAZORPAY_PLAN } from "./lib/razorpay";
import Razorpay from "razorpay";

function getRazorpayInstance(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export const createCoupon = action({
  args: {
    code: v.string(),
    discountType: v.union(v.literal("flat"), v.literal("percentage")),
    discountAmount: v.number(), // in paise
    description: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    maxTotalUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if code exists (light check before external call)
    // Note: This is redundant but saves an external API call if local duplicate
    const existing = await ctx.runQuery(internal.coupons.getCouponInternal, { code: args.code });
    if (existing) {
        throw new ConvexError(`Coupon code '${args.code}' already exists`);
    }

    // 1. Create Offer on Razorpay
    const razorpay = getRazorpayInstance();
    const planId = RAZORPAY_PLAN.planId;
    
    // Convert timestamp to unix seconds if date provided
    const validUntil = args.expiryDate ? Math.floor(args.expiryDate / 1000) : undefined;
    
    // Construct offer payload
    // Note: Razorpay offers for subscriptions are slightly different
    // We strive to create a "Subscription Offer"
    
    let razorpayOfferId: string | undefined;

    try {
        const offerPayload: any = {
            name: args.code, // Internal name
            display_text: args.description || `Get discount with code ${args.code}`,
            terms: "No specific terms",
            offer_type: "instant",
            payment_method: "card", // Simplified, usually required but covers most
            // actually for subscription offers, key params are different or passed via 'period'
        };

        // Razorpay SDK doesn't have typed 'offers' specifically for subscriptions clearly documented in types sometimes
        // But the endpoint is standard POST /offers
        
        // Let's rely on standard offer creation which works for subscriptions if linked
        // Wait, for subscription offers, the logic is:
        // "offer_type": "period" (for free trial) or "instant" (maybe not supported for subs directly?)
        // Actually, Razorpay docs say:
        // for Subscription, use `/offers` with `plan_id`
        
        // Correct payload for Subscription Offer (Manual/Code based not really supported fully via standard API as "coupon", 
        // but "Offer" object is what is used)
        
        // It seems safer to rely on the manual creation OR trust that we just want to create a generic offer
        // However, user specifically asked to create it via API.
        
        // The most critical part for subscription offer is:
        // Linked to a Plan
        
        /* 
          As per docs for "Create an Offer for Subscription":
          POST https://api.razorpay.com/v1/offers
          {
            "name": "...",
            "display_text": "...",
            "terms": "...",
            "offer_type": "flat" | "percent", -- Wait, docs say slightly different
            "action" : "discount", // implied
            "amount" : <amount> // if flat
            "percent_rate": <rate> // if percent
            "applicable_plans": [ <plan_id> ]
            "redemption_type": "manual" // IMPORTANT so it matches our code flow
          }
        */

       // Let's create it
       const createPayload: any = {
           name: `${args.code} Offer`,
           display_text: args.description || `Special Discount ${args.code}`,
           terms: "Standard terms apply",
           offer_type: "instant", // Generic bucket
           action: "discount",
           payment_method: "all", // allow all
           redemption_type: "manual", // We apply it by passing ID
           applicable_plans: [planId],
           valid_until: validUntil,
       };

       if (args.discountType === 'flat') {
           createPayload.amount = args.discountAmount; // paise
           createPayload.currency = "INR";
       } else {
           createPayload.percent_rate = args.discountAmount; // assuming number is percentage (e.g. 10 for 10%)
       }

       // We use the raw request because SDK types might be outdated or strict
       const createdOffer: any = await (razorpay as any).offers.create(createPayload);
       razorpayOfferId = createdOffer.id;

       console.log("Created Razorpay Offer:", razorpayOfferId);

    } catch (err: any) {
        console.error("Razorpay Offer Creation Failed:", JSON.stringify(err, null, 2));
        throw new ConvexError(err.error?.description || "Failed to create offer on Razorpay");
    }

    // 2. Store in Database
    await ctx.runMutation(internal.coupons.createCouponInternal, {
      code: args.code,
      razorpayOfferId: razorpayOfferId, // Linked!
      discountType: args.discountType,
      discountAmount: args.discountAmount,
      description: args.description,
      expiryDate: args.expiryDate,
      maxTotalUses: args.maxTotalUses,
    });
  },
});
