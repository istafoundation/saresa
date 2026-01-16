import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Parent accounts (authenticated via Clerk on web dashboard)
  parents: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.optional(v.string()),  // "parent" (default) | "admin"
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
    
    // Grammar Detective Stats (optional for backward compatibility)
    gdQuestionsAnswered: v.optional(v.number()),
    gdCorrectAnswers: v.optional(v.number()),
    gdTotalXPEarned: v.optional(v.number()),
    gdCurrentQuestionIndex: v.optional(v.number()),  // Resume position
  }).index("by_child_id", ["childId"]),

  // ============================================
  // OTA CONTENT MANAGEMENT SYSTEM
  // ============================================

  // Main content storage for all games
  gameContent: defineTable({
    // Content type
    type: v.union(
      v.literal("wordle_word"),
      v.literal("word_set"),
      v.literal("hard_question"),
      v.literal("gk_question"),
      v.literal("pos_question")
    ),
    gameId: v.string(),  // "wordle", "word-finder", "english-insane"
    
    // The actual content payload (varies by type)
    data: v.any(),
    
    // Lifecycle status
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("scheduled"),
      v.literal("archived")
    ),
    
    // Versioning
    version: v.number(),
    
    // Organization
    tags: v.array(v.string()),  // ["seasonal", "halloween", "advanced"]
    packId: v.optional(v.string()),  // Link to content pack
    
    // Scheduling (for scheduled content)
    validFrom: v.optional(v.number()),  // Timestamp
    validUntil: v.optional(v.number()),
    
    // Priority for weighted selection
    priority: v.number(),  // Higher = more likely to show
    
    // Metadata
    createdBy: v.optional(v.id("parents")),  // Admin who created it
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game_status", ["gameId", "status"])
    .index("by_type_status", ["type", "status"])
    .index("by_pack", ["packId"]),

  // Version tracking per game (for cache invalidation)
  contentVersions: defineTable({
    gameId: v.string(),
    version: v.number(),
    publishedAt: v.number(),
    description: v.string(),
    contentCount: v.number(),  // How many items in this version
    checksum: v.string(),  // For cache validation
  })
    .index("by_game", ["gameId"])
    .index("by_game_version", ["gameId", "version"]),

  // Content performance analytics
  contentAnalytics: defineTable({
    contentId: v.id("gameContent"),
    gameId: v.string(),
    
    // Usage metrics
    timesShown: v.number(),
    timesCompleted: v.number(),
    successRate: v.number(),  // 0.0 - 1.0
    
    // Time metrics
    avgTimeSpent: v.number(),  // milliseconds
    
    // Skip/abandon rate
    skipCount: v.number(),
    
    // Calculated difficulty based on performance
    calculatedDifficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    
    lastUpdated: v.number(),
  })
    .index("by_content", ["contentId"])
    .index("by_game", ["gameId"]),

  // Content packs for seasonal/event groupings
  contentPacks: defineTable({
    name: v.string(),
    description: v.string(),
    gameId: v.string(),
    
    // Activation rules
    activationType: v.union(
      v.literal("always"),
      v.literal("scheduled"),
      v.literal("manual")
    ),
    isActive: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    priority: v.number(),
    
    // Theming
    theme: v.optional(v.object({
      primaryColor: v.string(),
      iconEmoji: v.string(),
      specialEffect: v.optional(v.string()),
    })),
    
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_active", ["isActive"]),
});
