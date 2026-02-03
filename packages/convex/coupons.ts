import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// ------------------------------------------------------------------
// ADMIN FUNCTIONS
// ------------------------------------------------------------------

// Get all coupons (Admin)
export const getCoupons = query({
  args: {},
  handler: async (ctx) => {
    // Check admin setup
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    
    // In a real app we'd check for admin role here specifically
    // relying on parent/admin check logic from other files if needed
    // or just assuming dashboard access implies admin for now based on 'parents.isAdmin'
    
    return await ctx.db.query("coupons").order("desc").collect();
  },
});

// Create a new coupon (Internal - called from couponActions)
export const createCouponInternal = internalMutation({
  args: {
    code: v.string(),
    razorpayOfferId: v.optional(v.string()),
    discountType: v.union(v.literal("flat"), v.literal("percentage")),
    discountAmount: v.number(), // in paise
    description: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    maxTotalUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Identity check optional here if trusted internal call, but kept for consistency if context passed
    // const identity = await ctx.auth.getUserIdentity(); 
    
    // Check if code exists
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new ConvexError(`Coupon code '${args.code}' already exists`);
    }

    const parent = await ctx.db.query("parents").first(); // Fallback or need real user?
    // Since this is internal, we might lose the direct 'user who created it' 
    // unless we pass it from action. ideally pass 'createdById' or just skip
    // For now we will find the first admin or leave undefined if not critical
    
    await ctx.db.insert("coupons", {
      code: args.code,
      razorpayOfferId: args.razorpayOfferId,
      discountType: args.discountType,
      discountAmount: args.discountAmount,
      description: args.description,
      isActive: true, // Active by default
      expiryDate: args.expiryDate,
      maxTotalUses: args.maxTotalUses,
      usageCount: 0,
      createdAt: Date.now(),
      createdBy: parent?._id, // Best effort
    });
  },
});

// Toggle coupon status
export const toggleCouponStatus = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const coupon = await ctx.db.get(args.id);
    if (!coupon) throw new ConvexError("Coupon not found");

    await ctx.db.patch(args.id, {
      isActive: !coupon.isActive,
    });
  },
});

// ------------------------------------------------------------------
// PUBLIC/USER FUNCTIONS
// ------------------------------------------------------------------

// Validate a coupon code
export const validateCoupon = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!coupon) {
      return { valid: false, error: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is inactive" };
    }

    if (coupon.expiryDate && Date.now() > coupon.expiryDate) {
      return { valid: false, error: "Coupon has expired" };
    }

    if (coupon.maxTotalUses && coupon.usageCount >= coupon.maxTotalUses) {
      return { valid: false, error: "Coupon usage limit exceeded" };
    }

    return {
      valid: true,
      coupon: {
        code: coupon.code,
        discountAmount: coupon.discountAmount,
        discountType: coupon.discountType,
        razorpayOfferId: coupon.razorpayOfferId,
      },
    };
  },
});

// Internal: Increment usage (called from subscriptionActions)
export const incrementCouponUsage = internalMutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (coupon) {
      await ctx.db.patch(coupon._id, {
        usageCount: coupon.usageCount + 1,
      });
    }
  },
});

// Internal: Get coupon for action validation
export const getCouponInternal = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});
