import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Parent accounts (authenticated via Clerk on web dashboard)
  parents: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Child accounts (created by parents, login with username/password)
  children: defineTable({
    parentId: v.id("parents"),
    username: v.string(),        // Unique, parent-chosen
    password: v.string(),        // Parent-chosen (plaintext for parent visibility)
    name: v.string(),            // Child's display name
    role: v.string(),            // "user" (future: "admin", "premium")
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_parent", ["parentId"])
    .index("by_username", ["username"]),

  // Child login sessions (for mobile app auth)
  childSessions: defineTable({
    childId: v.id("children"),
    token: v.string(),           // Random session token
    expiresAt: v.number(),       // Timestamp when session expires
    createdAt: v.number(),
    // Device fingerprinting (optional for backward compatibility)
    deviceId: v.optional(v.string()),     // Unique device identifier
    deviceName: v.optional(v.string()),   // e.g., "iPhone 14", "Pixel 7"
    platform: v.optional(v.string()),     // e.g., "ios", "android"
  })
    .index("by_token", ["token"])
    .index("by_child", ["childId"])
    .index("by_expires_at", ["expiresAt"]),  // For efficient cleanup queries


  // User game data (linked to child account)
  users: defineTable({
    childId: v.id("children"),   // Link to children table
    
    // Profile
    name: v.string(),
    mascot: v.union(v.literal("male"), v.literal("female")),
    onboardingComplete: v.boolean(),
    
    // Progression
    xp: v.number(),
    streak: v.number(),
    lastLoginDate: v.optional(v.string()), // ISO date "2026-01-14"
    
    // Collections
    unlockedArtifacts: v.array(v.string()),
    unlockedWeapons: v.array(v.string()),
    
    // Currency
    weaponShards: v.number(),
    weaponDuplicates: v.record(v.string(), v.number()),
    
    // GK Quiz Stats
    gkPracticeTotal: v.number(),
    gkPracticeCorrect: v.number(),
    gkLastCompetitiveDate: v.optional(v.string()),
    
    // Wordle Stats
    wordleGamesPlayed: v.number(),
    wordleGamesWon: v.number(),
    wordleCurrentStreak: v.number(),
    wordleMaxStreak: v.number(),
    wordleGuessDistribution: v.array(v.number()),
    wordleLastPlayedDate: v.optional(v.string()),
    wordleHintUsedDate: v.optional(v.string()), // Date when hint was used (IST)
    
    // Word Finder Stats
    wfEasyGamesPlayed: v.number(),
    wfEasyWordsFound: v.number(),
    wfHardGamesPlayed: v.number(),
    wfHardCorrectAnswers: v.number(),
    wfTotalXPEarned: v.number(),
    wfLastEasyDate: v.optional(v.string()),
    wfLastHardDate: v.optional(v.string()),
    wfEasyAttemptsToday: v.number(),
  }).index("by_child_id", ["childId"]),
});
