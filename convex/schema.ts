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
    // Learning level group - determines which question sets are shown
    group: v.optional(v.union(
      v.literal("A"),  // Class 1-4 (Sets 1, 3, 5)
      v.literal("B"),  // Class 5-8 (Sets 1, 2, 3) - default
      v.literal("C")   // Class 9-10 (Sets 1, 2, 4)
    )),
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
    
    // Explorer Stats (India Explorer)
    expCorrectAnswers: v.optional(v.number()),       // Total correct across all days
    expTotalXPEarned: v.optional(v.number()),        // Total XP earned
    expLastPlayedDate: v.optional(v.string()),       // IST date "2026-01-16"
    expGuessedToday: v.optional(v.array(v.string())), // ["IN-MH", "IN-KA", ...] - prevents repeats

    // Let'em Cook Stats (Spice Matching - DAILY CHALLENGE)
    lecLastPlayedDate: v.optional(v.string()),       // ISO date "2026-01-23"
    lecDailyScore: v.optional(v.number()),           // Today's score
    lecDailyXP: v.optional(v.number()),              // Today's XP earned
    lecTotalCorrect: v.optional(v.number()),         // Lifetime correct answers
    lecTotalGamesPlayed: v.optional(v.number()),     // Lifetime games played
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
    
    // Question Set for level-based filtering (English Insane, Word Finder)
    // Set 1: EasyC, MediumB, HardA (All groups)
    // Set 2: MediumC, HardB (Groups B, C)
    // Set 3: EasyB, MediumA (Groups A, B)
    // Set 4: HardC (Group C only)
    // Set 5: EasyA (Group A only)
    questionSet: v.optional(v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5)
    )),
    
    // Metadata
    createdBy: v.optional(v.id("parents")),  // Admin who created it
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game_status", ["gameId", "status"])
    .index("by_type_status", ["type", "status"])
    .index("by_pack", ["packId"])
    .index("by_game_set", ["gameId", "questionSet"]),

  // ============================================
  // SPICES TABLE (Let'em Cook Game)
  // ============================================
  
  // Spice entries for matching game
  spices: defineTable({
    name: v.string(),                    // Display name (e.g., "Turmeric")
    imageUrl: v.string(),                // ImageKit hosted URL
    hindiName: v.optional(v.string()),   // Hindi name (optional)
    description: v.optional(v.string()), // Brief description
    
    // Status for admin control
    isEnabled: v.boolean(),              // false = hidden from game
    
    // Metadata
    createdBy: v.optional(v.id("parents")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["isEnabled"]),

  // Game settings (singleton per game)
  gameSettings: defineTable({
    gameId: v.string(),                  // "let-em-cook", etc.
    
    // Let'em Cook settings
    lecQuestionsPerGame: v.optional(v.number()),  // Default: 1
    
    // Metadata
    updatedBy: v.optional(v.id("parents")),
    updatedAt: v.number(),
  })
    .index("by_game", ["gameId"]),

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

  // ============================================
  // SUBSCRIPTION MANAGEMENT (Razorpay)
  // ============================================

  // Subscription records linked to children
  subscriptions: defineTable({
    childId: v.id("children"),
    parentId: v.id("parents"),
    
    // Razorpay IDs
    razorpaySubscriptionId: v.string(),
    razorpayPlanId: v.string(),
    razorpayCustomerId: v.optional(v.string()),
    
    // Plan details
    planGroup: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
    amount: v.number(), // in paise (8900, 12900, 18900)
    
    // Status
    status: v.union(
      v.literal("created"),
      v.literal("authenticated"),
      v.literal("active"),
      v.literal("pending"),
      v.literal("halted"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("expired")
    ),
    
    // Dates
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()), // "Activated till" date
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_child", ["childId"])
    .index("by_parent", ["parentId"])
    .index("by_razorpay_id", ["razorpaySubscriptionId"]),

  // Payment history for subscriptions
  subscriptionPayments: defineTable({
    subscriptionId: v.id("subscriptions"),
    childId: v.id("children"),
    parentId: v.id("parents"),
    
    // Razorpay payment details
    razorpayPaymentId: v.string(),
    razorpayInvoiceId: v.optional(v.string()),
    
    amount: v.number(), // in paise
    status: v.union(v.literal("captured"), v.literal("failed"), v.literal("refunded")),
    
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_child", ["childId"])
    .index("by_parent", ["parentId"]),

  // ============================================
  // LEVEL PROGRESSION SYSTEM (Candy Crush Style)
  // ============================================

  // Level configuration
  levels: defineTable({
    levelNumber: v.number(),           // Display order (1, 2, 3...)
    name: v.string(),                  // "The Beginning"
    description: v.optional(v.string()),
    isEnabled: v.boolean(),            // false = "Coming Soon" (default: false)
    
    // Dynamic difficulties - admin can add/remove
    difficulties: v.array(v.object({
      name: v.string(),                // "easy", "medium", "hard"
      displayName: v.string(),         // "Easy", "Medium", "Hard"
      requiredScore: v.number(),       // 90, 65, 33 (percentage to pass)
      order: v.number(),               // 1, 2, 3 (sequential unlock)
    })),
    
    // Visual theming
    theme: v.optional(v.object({
      emoji: v.string(),               // 🌟, 🔥, 🏆
      color: v.string(),               // hex color for node
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_level_number", ["levelNumber"])
    .index("by_enabled", ["isEnabled"]),

  // Questions for each level
  levelQuestions: defineTable({
    levelId: v.id("levels"),
    difficultyName: v.string(),        // Must match level's difficulty name
    
    // Question type determines rendering
    questionType: v.union(
      v.literal("mcq"),                // English Insane style MCQ
      v.literal("grid"),               // Word Finder style grid
      v.literal("map"),                // Explorer style map selection
      v.literal("select"),             // Grammar Detective style word selection
      v.literal("match")               // Picture matching - connect images to texts
    ),
    
    question: v.string(),              // The question/prompt text
    data: v.any(),                     // Type-specific data (options, solution, etc.)
    
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_level", ["levelId"])
    .index("by_level_difficulty", ["levelId", "difficultyName"])
    .index("by_status", ["status"]),

  // User progress per level
  levelProgress: defineTable({
    childId: v.id("children"),
    levelId: v.id("levels"),
    
    // Dynamic progress matching level's difficulties
    difficultyProgress: v.array(v.object({
      difficultyName: v.string(),
      highScore: v.number(),           // 0-100 percentage
      passed: v.boolean(),
      attempts: v.number(),
    })),
    
    isCompleted: v.boolean(),          // All difficulties passed
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_child", ["childId"])
    .index("by_child_level", ["childId", "levelId"]),

  // ============================================
  // RATE LIMITING & SECURITY
  // ============================================

  // Track rate limit events per user/action
  rateLimitEvents: defineTable({
    childId: v.optional(v.id("children")),  // null for unauthenticated requests (like login)
    parentId: v.optional(v.id("parents")),  // For parent-side rate limiting
    action: v.string(),                      // "login", "addXP", "mutation", etc.
    identifier: v.string(),                  // username for login, childId for others
    timestamp: v.number(),
    windowStart: v.number(),                 // Start of the rate limit window
    count: v.number(),                       // Count in current window
  })
    .index("by_identifier_action", ["identifier", "action"])
    .index("by_child_action", ["childId", "action"])
    .index("by_timestamp", ["timestamp"]),

  // Notifications when users hit rate limits (for admin dashboard)
  rateLimitNotifications: defineTable({
    childId: v.optional(v.id("children")),
    parentId: v.optional(v.id("parents")),
    childName: v.optional(v.string()),
    username: v.optional(v.string()),
    action: v.string(),                      // Which action was rate limited
    limit: v.number(),                       // The limit that was hit
    count: v.number(),                       // How many times they tried
    windowMinutes: v.number(),               // The window in minutes
    createdAt: v.number(),
    isRead: v.boolean(),                     // For marking as read
  })
    .index("by_created", ["createdAt"])
    .index("by_read", ["isRead"]),
});
