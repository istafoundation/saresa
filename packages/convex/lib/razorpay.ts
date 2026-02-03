// Razorpay Plan Configuration and Utilities
// Single plan at ₹351/month (discount code ISTA51 for ₹51 off)

export const RAZORPAY_PLAN = {
  planId: "plan_S9yMMepHixI2Ca",
  amount: 35100, // ₹351 in paise
  name: "ISTA English Premium",
  interval: "monthly" as const,
} as const;

// Get plan details
export function getPlan() {
  return RAZORPAY_PLAN;
}

// Get amount in rupees for display
export function formatAmountInRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

