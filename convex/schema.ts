import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    
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
    
    // Word Finder Stats
    wfEasyGamesPlayed: v.number(),
    wfEasyWordsFound: v.number(),
    wfHardGamesPlayed: v.number(),
    wfHardCorrectAnswers: v.number(),
    wfTotalXPEarned: v.number(),
    wfLastEasyDate: v.optional(v.string()),
    wfLastHardDate: v.optional(v.string()),
    wfEasyAttemptsToday: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
});
