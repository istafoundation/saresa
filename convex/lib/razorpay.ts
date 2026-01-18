// Razorpay Plan Configuration and Utilities
// Plan IDs from Razorpay Dashboard

export const RAZORPAY_PLANS = {
  A: {
    planId: "plan_S5RCSW2zaRhQl9",
    amount: 8900, // ₹89 in paise
    name: "Group A - Class 1-4",
    interval: "monthly" as const,
  },
  B: {
    planId: "plan_S5REYjYZCe5Yy2",
    amount: 12900, // ₹129 in paise
    name: "Group B - Class 5-8",
    interval: "monthly" as const,
  },
  C: {
    planId: "plan_S5RFLB6Dq1vrtG",
    amount: 18900, // ₹189 in paise
    name: "Group C - Class 9-10",
    interval: "monthly" as const,
  },
} as const;

export type PlanGroup = keyof typeof RAZORPAY_PLANS;

// Get plan details by group
export function getPlanByGroup(group: PlanGroup) {
  return RAZORPAY_PLANS[group];
}

// Get amount in rupees for display
export function formatAmountInRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}
