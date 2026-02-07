import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { checkRateLimit } from "./lib/rateLimit";
import { calculateLevelProgressionCoins, calculateNewCoins } from "./lib/coins";

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify admin status
async function requireAdmin(ctx: any): Promise<Id<"parents">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Must be logged in");
  }

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!parent || parent.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return parent._id;
}

// Generate a unique 6-digit question code
async function generateUniqueQuestionCode(ctx: any): Promise<string> {
  const generate = () => Math.floor(100000 + Math.random() * 900000).toString();

  let code = generate();
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await ctx.db
      .query("levelQuestions")
      .withIndex("by_question_code", (q: any) => q.eq("questionCode", code))
      .first();

    if (!existing) {
      isUnique = true;
    } else {
      code = generate();
      attempts++;
    }
  }

  if (!isUnique)
    throw new ConvexError("Failed to generate unique question code");
  return code;
}

// ============================================
// MOBILE APP QUERIES
// ============================================

// Get all levels with user's progress (for mobile home screen)
export const getAllLevelsWithProgress = query({
  args: { token: v.string(), groupId: v.optional(v.id("levelGroups")) },
  handler: async (ctx, args) => {
    // Validate session
    const sessionIdentity = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!sessionIdentity || sessionIdentity.expiresAt < Date.now()) {
      throw new ConvexError("Invalid or expired session");
    }

    // Fetch data in parallel
    const [levelsData, groups, progress] = await Promise.all([
      ctx.db.query("levels").withIndex("by_level_number").collect(),
      ctx.db.query("levelGroups").collect(),
      ctx.db.query("levelProgress").withIndex("by_child", (q) => q.eq("childId", sessionIdentity.childId)).collect(),
    ]);

    let levels = levelsData;

    // Filter by group if provided
    if (args.groupId) {
        levels = levels.filter(l => l.groupId === args.groupId);
    }

    const groupMap = new Map(groups.map((g) => [g._id, g]));
    const progressMap = new Map(progress.map((p) => [p.levelId, p]));

    // Sort levels: Group Order -> Level Number
    levels.sort((a, b) => {
        const orderA = a.groupId ? groupMap.get(a.groupId)?.order ?? 9999 : 9999;
        const orderB = b.groupId ? groupMap.get(b.groupId)?.order ?? 9999 : 9999;
        
        if (orderA !== orderB) return orderA - orderB;
        return a.levelNumber - b.levelNumber;
    });

    // Determine unlock status for each level
    let previousLevelCompleted = true; // Level 1 is always unlockable

    return levels.map((level, index) => {
      const levelProgress = progressMap.get(level._id);

      // Determine level state
      let state: "locked" | "unlocked" | "completed" | "coming_soon";

      if (!level.isEnabled) {
        state = "coming_soon";
      } else if (levelProgress?.isCompleted) {
        state = "completed";
      } else if (previousLevelCompleted || index === 0) {
        state = "unlocked";
      } else {
        state = "locked";
      }

      // Update for next iteration
      // Note: This logic assumes linear progression across ALL groups/levels.
      // If we want gated groups, we'd need group-level logic, but typical sequential is fine.
      if (level.isEnabled) {
        previousLevelCompleted = levelProgress?.isCompleted ?? false;
      }

      return {
        ...level,
        state,
        progress: levelProgress ?? null,
        group: level.groupId ? groupMap.get(level.groupId) : null
      };
    });
  },
});

// Get questions for a specific level and difficulty
export const getLevelQuestions = query({
  args: {
    token: v.string(),
    levelId: v.id("levels"),
    difficultyName: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Invalid or expired session");
    }

    // Get active questions for this level and difficulty
    // Return in creation order (as entered in dashboard)
    const questions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level_difficulty", (q) =>
        q.eq("levelId", args.levelId).eq("difficultyName", args.difficultyName),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Sort by order field, then creation time for stability
    return questions.sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.createdAt - b.createdAt;
    });
  },
});

// Reorder levels (swap levelNumber)
export const reorderLevels = mutation({
  args: {
    levelId: v.id("levels"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) throw new ConvexError("Level not found");

    // Sort levels by current levelNumber
    const levels = await ctx.db
      .query("levels")
      .withIndex("by_level_number")
      .collect();

    levels.sort((a, b) => a.levelNumber - b.levelNumber);

    const currentIndex = levels.findIndex((l) => l._id === args.levelId);
    if (currentIndex === -1) throw new ConvexError("Level not found in list");

    // Find target index
    const targetIndex =
      args.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= levels.length) return; // Cannot move

    // Swap in memory
    const temp = levels[currentIndex];
    levels[currentIndex] = levels[targetIndex];
    levels[targetIndex] = temp;

    // Re-index ALL levels to ensure sequential integrity
    for (let i = 0; i < levels.length; i++) {
      const expectedNum = i + 1;
      if (levels[i].levelNumber !== expectedNum) {
        await ctx.db.patch(levels[i]._id, { levelNumber: expectedNum });
      }
    }
  },
});

// Reorder difficulties (swap order in array)
export const reorderDifficulties = mutation({
  args: {
    levelId: v.id("levels"),
    difficultyName: v.string(),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) throw new ConvexError("Level not found");

    const diffIndex = level.difficulties.findIndex(
      (d) => d.name === args.difficultyName,
    );
    if (diffIndex === -1) throw new ConvexError("Difficulty not found");

    const targetIndex = args.direction === "up" ? diffIndex - 1 : diffIndex + 1;
    if (targetIndex < 0 || targetIndex >= level.difficulties.length) return;

    // Create mutable copies of difficulties
    const newDifficulties = level.difficulties.map((d) => ({ ...d }));

    // Swap
    const temp = newDifficulties[diffIndex];
    newDifficulties[diffIndex] = newDifficulties[targetIndex];
    newDifficulties[targetIndex] = temp;

    // Update order fields to ensure they are sequential
    newDifficulties.forEach((d, i) => {
      d.order = i + 1;
    });

    await ctx.db.patch(level._id, { difficulties: newDifficulties });
  },
});

// Reorder questions
export const reorderQuestions = mutation({
  args: {
    questionId: v.id("levelQuestions"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const question = await ctx.db.get(args.questionId);
    if (!question) throw new ConvexError("Question not found");

    // Get all questions in this group to determine order
    const siblings = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level_difficulty", (q) =>
        q
          .eq("levelId", question.levelId)
          .eq("difficultyName", question.difficultyName),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Stable sort
    siblings.sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.createdAt - b.createdAt;
    });

    const currentIndex = siblings.findIndex((q) => q._id === question._id);
    if (currentIndex === -1) return;

    const targetIndex =
      args.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    // Swap in memory
    const temp = siblings[currentIndex];
    siblings[currentIndex] = siblings[targetIndex];
    siblings[targetIndex] = temp;

    // Re-index ALL siblings to fix gaps/dupes
    await Promise.all(
      siblings.map((q, index) => {
        const newOrder = index + 1;
        if (q.order !== newOrder) {
          return ctx.db.patch(q._id, { order: newOrder });
        }
        return Promise.resolve();
      }),
    );

    // If we want to accept that other items might have gaps/dupes, this swap works
    // IF we assume they were sorted correctly before.
    // To be robust:
    /*
    const updates = [];
    siblings.forEach((q, idx) => {
       if (idx === currentIndex) updates.push({ id: q._id, order: targetIndex + 1 });
       else if (idx === targetIndex) updates.push({ id: q._id, order: currentIndex + 1 });
       else if (q.order !== idx + 1) updates.push({ id: q._id, order: idx + 1 });
    });
    // Applying all is expensive. Just swapping is usually fine.
    */
  },
});

// Submit level attempt and update progress
export const submitLevelAttempt = mutation({
  args: {
    token: v.string(),
    levelId: v.id("levels"),
    difficultyName: v.string(),
    score: v.number(), // 0-100 percentage
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("childSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Invalid or expired session");
    }

    // Rate limit to prevent coin farming exploits
    const child = await ctx.db.get(session.childId);
    await checkRateLimit(
      ctx,
      "finishGame",
      session.childId as string,
      session.childId,
      child?.name,
      child?.username
    );

    // Get level to check required score
    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    const difficulty = level.difficulties.find(
      (d) => d.name === args.difficultyName,
    );
    if (!difficulty) {
      throw new ConvexError("Difficulty not found");
    }

    const passed = args.score >= difficulty.requiredScore;

    // Get or create progress record
    let progress = await ctx.db
      .query("levelProgress")
      .withIndex("by_child_level", (q) =>
        q.eq("childId", session.childId).eq("levelId", args.levelId),
      )
      .first();

    let coinsEarned = 0;
    const possibleCoins = calculateLevelProgressionCoins(args.difficultyName);
    let shouldAwardCoins = false;

    if (!progress) {
      // Create new progress with all difficulties from the level
      const difficultyProgress = level.difficulties.map((d) => ({
        difficultyName: d.name,
        highScore: d.name === args.difficultyName ? args.score : 0,
        passed: d.name === args.difficultyName ? passed : false,
        attempts: d.name === args.difficultyName ? 1 : 0,
      }));

      const allPassed = difficultyProgress.every((dp) => dp.passed);

      await ctx.db.insert("levelProgress", {
        childId: session.childId,
        levelId: args.levelId,
        difficultyProgress,
        isCompleted: allPassed,
        completedAt: allPassed ? Date.now() : undefined,
        updatedAt: Date.now(),
      });

      // Award coins if passed (First time ever playing this level, so definitely new)
      if (passed) {
        shouldAwardCoins = true;
        coinsEarned = possibleCoins;
      }

      // Update user coins if needed
      if (shouldAwardCoins) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_child_id", (q) => q.eq("childId", session.childId))
          .first();

        if (user) {
          await ctx.db.patch(user._id, {
            coins: calculateNewCoins(user, coinsEarned),
          });
        }
      }

      return {
        passed,
        score: args.score,
        isNewHighScore: true,
        levelCompleted: allPassed,
        coinsEarned,
      };
    }

    // Update existing progress
    const existingDiff = progress.difficultyProgress.find(
      (dp) => dp.difficultyName === args.difficultyName,
    );
    const alreadyPassed = existingDiff?.passed ?? false;

    const updatedDifficultyProgress = progress.difficultyProgress.map((dp) => {
      if (dp.difficultyName === args.difficultyName) {
        const isNewHighScore = args.score > dp.highScore;
        return {
          ...dp,
          highScore: isNewHighScore ? args.score : dp.highScore,
          passed: dp.passed || passed,
          attempts: dp.attempts + 1,
        };
      }
      return dp;
    });

    // Check if a new difficulty was attempted that wasn't in the array
    if (!existingDiff) {
      updatedDifficultyProgress.push({
        difficultyName: args.difficultyName,
        highScore: args.score,
        passed,
        attempts: 1,
      });
    }

    const allPassed = level.difficulties.every(
      (d) =>
        updatedDifficultyProgress.find((dp) => dp.difficultyName === d.name)
          ?.passed ?? false,
    );

    const wasCompleted = progress.isCompleted;
    const isNewHighScore = args.score > (existingDiff?.highScore ?? 0);

    // Award coins ONLY if passed AND it wasn't already passed
    if (passed && !alreadyPassed) {
      shouldAwardCoins = true;
      coinsEarned = possibleCoins;
    }

    if (shouldAwardCoins) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_child_id", (q) => q.eq("childId", session.childId))
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          coins: calculateNewCoins(user, coinsEarned),
        });
      }
    }

    await ctx.db.patch(progress._id, {
      difficultyProgress: updatedDifficultyProgress,
      isCompleted: allPassed,
      completedAt:
        allPassed && !wasCompleted ? Date.now() : progress.completedAt,
      updatedAt: Date.now(),
    });

    return {
      passed,
      score: args.score,
      isNewHighScore,
      levelCompleted: allPassed && !wasCompleted,
      coinsEarned,
    };
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

// Get all levels for admin dashboard
export const getLevelsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const levels = await ctx.db
      .query("levels")
      .withIndex("by_level_number")
      .collect();
    
    // Sort by Group Order then Level Number
    // Fetch all groups to get order
    const groups = await ctx.db.query("levelGroups").collect();
    const groupOrder = new Map(groups.map(g => [g._id, g.order]));

    // Sort: No Group (Legacy) -> Group 1 -> Group 2...
    levels.sort((a, b) => {
        const orderA = a.groupId ? (groupOrder.get(a.groupId) ?? 999) : 999; // Legacy levels go last or first? Let's say last if not migrated.
        const orderB = b.groupId ? (groupOrder.get(b.groupId) ?? 999) : 999;
        
        if (orderA !== orderB) return orderA - orderB;
        return a.levelNumber - b.levelNumber;
    });

    // Calculate counts dynamically from actual questions to ensuring accuracy
    const levelsWithCounts = await Promise.all(
      levels.map(async (level) => {
        // We explicitly fetch all questions to get the real count
        // This fixes the issue where denormalized counts might be out of sync
        const questions = await ctx.db
          .query("levelQuestions")
          .withIndex("by_level", (q) => q.eq("levelId", level._id))
          .collect();

        const questionCounts: Record<string, number> = {};
        let totalQuestions = 0;

        questions.forEach((q) => {
          const diff = q.difficultyName;
          questionCounts[diff] = (questionCounts[diff] || 0) + 1;
          totalQuestions++;
        });

        return {
          ...level,
          questionCounts,
          totalQuestions,
        };
      }),
    );

    return levelsWithCounts;
  },
});

// Get questions for a level (admin)
export const getLevelQuestionsAdmin = query({
  args: { levelId: v.id("levels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const questions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level", (q) => q.eq("levelId", args.levelId))
      .collect();

    // Group by difficulty and Sort
    const grouped: Record<string, typeof questions> = {};
    questions.forEach((q) => {
      if (!grouped[q.difficultyName]) {
        grouped[q.difficultyName] = [];
      }
      grouped[q.difficultyName].push(q);
    });

    // Sort each group
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.createdAt - b.createdAt;
      });
    });

    return grouped;
  },
});

// Search questions by code or text
export const searchQuestionsAdmin = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (!args.query) return [];

    // First try exact match on questionCode
    const codeMatch = await ctx.db
      .query("levelQuestions")
      .withIndex("by_question_code", (q) => q.eq("questionCode", args.query))
      .first();

    if (codeMatch) {
      // Fetch level info to provide context
      const level = await ctx.db.get(codeMatch.levelId);
      return [
        {
          ...codeMatch,
          levelName: level?.name,
          levelNumber: level?.levelNumber,
        },
      ];
    }

    // Fallback: This is expensive if we scan everything, but for admin it's okay for now.
    // Better to encourage using the code.
    // We won't do full text search on 'question' field here to avoid scanning table.
    // If we really need text search, we should use Convex search capabilities.
    return [];
  },
});

// ============================================
// ADMIN MUTATIONS - LEVELS
// ============================================

// Create a new level (disabled by default)
export const createLevel = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    groupId: v.optional(v.id("levelGroups")),
    theme: v.optional(
      v.object({
        emoji: v.string(),
        color: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get the next level number
    const levels = await ctx.db
      .query("levels")
      .withIndex("by_level_number")
      .collect();

    const nextNumber =
      levels.length > 0 ? Math.max(...levels.map((l) => l.levelNumber)) + 1 : 1;

    // Default difficulties
    const defaultDifficulties = [
      { name: "easy", displayName: "Easy", requiredScore: 75, order: 1 },
      { name: "medium", displayName: "Medium", requiredScore: 55, order: 2 },
      { name: "hard", displayName: "Hard", requiredScore: 30, order: 3 },
    ];

    const levelId = await ctx.db.insert("levels", {
      levelNumber: nextNumber,
      name: args.name,
      description: args.description,
      groupId: args.groupId,
      isEnabled: false, // Disabled by default
      difficulties: defaultDifficulties,
      theme: args.theme,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return levelId;
  },
});

// Update level details
export const updateLevel = mutation({
  args: {
    levelId: v.id("levels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    groupId: v.optional(v.id("levelGroups")),
    theme: v.optional(
      v.object({
        emoji: v.string(),
        color: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { levelId, ...updates } = args;
    const filteredUpdates: any = { updatedAt: Date.now() };

    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.description !== undefined)
      filteredUpdates.description = updates.description;
    if (updates.groupId !== undefined) filteredUpdates.groupId = updates.groupId;
    if (updates.theme !== undefined) filteredUpdates.theme = updates.theme;

    await ctx.db.patch(levelId, filteredUpdates);
  },
});

export const moveLevelToGroup = mutation({
  args: {
    levelId: v.id("levels"),
    groupId: v.id("levelGroups"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.levelId, {
        groupId: args.groupId,
        updatedAt: Date.now(),
    });
  },
});

// Toggle level enabled/disabled
export const toggleLevelEnabled = mutation({
  args: { levelId: v.id("levels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    await ctx.db.patch(args.levelId, {
      isEnabled: !level.isEnabled,
      updatedAt: Date.now(),
    });

    return !level.isEnabled;
  },
});

// Delete a level and its questions
export const deleteLevel = mutation({
  args: { levelId: v.id("levels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Delete all questions for this level
    const questions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level", (q) => q.eq("levelId", args.levelId))
      .collect();

    for (const question of questions) {
      await ctx.db.delete(question._id);
    }

    // Delete the level
    await ctx.db.delete(args.levelId);
  },
});

// ============================================
// ADMIN MUTATIONS - DIFFICULTIES
// ============================================

// Add a difficulty to a level
export const addDifficulty = mutation({
  args: {
    levelId: v.id("levels"),
    name: v.string(),
    displayName: v.string(),
    requiredScore: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    // Check for duplicate name
    if (level.difficulties.some((d) => d.name === args.name)) {
      throw new ConvexError("Difficulty name already exists");
    }

    // Add at the end
    const nextOrder =
      level.difficulties.length > 0
        ? Math.max(...level.difficulties.map((d) => d.order)) + 1
        : 1;

    await ctx.db.patch(args.levelId, {
      difficulties: [
        ...level.difficulties,
        {
          name: args.name,
          displayName: args.displayName,
          requiredScore: args.requiredScore,
          order: nextOrder,
        },
      ],
      updatedAt: Date.now(),
    });
  },
});

// Update a difficulty
export const updateDifficulty = mutation({
  args: {
    levelId: v.id("levels"),
    difficultyName: v.string(),
    displayName: v.optional(v.string()),
    requiredScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    const updatedDifficulties = level.difficulties.map((d) => {
      if (d.name === args.difficultyName) {
        return {
          ...d,
          displayName: args.displayName ?? d.displayName,
          requiredScore: args.requiredScore ?? d.requiredScore,
        };
      }
      return d;
    });

    await ctx.db.patch(args.levelId, {
      difficulties: updatedDifficulties,
      updatedAt: Date.now(),
    });
  },
});

// Delete a difficulty (and its questions)
export const deleteDifficulty = mutation({
  args: {
    levelId: v.id("levels"),
    difficultyName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    // Must have at least one difficulty
    if (level.difficulties.length <= 1) {
      throw new ConvexError("Cannot delete the only difficulty");
    }

    // Delete questions for this difficulty
    const questions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level_difficulty", (q) =>
        q.eq("levelId", args.levelId).eq("difficultyName", args.difficultyName),
      )
      .collect();

    for (const question of questions) {
      await ctx.db.delete(question._id);
    }

    // Remove difficulty from level
    await ctx.db.patch(args.levelId, {
      difficulties: level.difficulties.filter(
        (d) => d.name !== args.difficultyName,
      ),
      updatedAt: Date.now(),
    });

    // Update level counts
    // Recalculate from scratch to ensure accuracy
    const allQuestions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level", (q) => q.eq("levelId", args.levelId))
      .collect();

    const questionCounts: Record<string, number> = {};
    let totalQuestions = 0;

    allQuestions.forEach((q) => {
      const diff = q.difficultyName;
      questionCounts[diff] = (questionCounts[diff] || 0) + 1;
      totalQuestions++;
    });

    await ctx.db.patch(args.levelId, {
      questionCounts,
      totalQuestions,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// ADMIN MUTATIONS - QUESTIONS
// ============================================

// Add a question
export const addQuestion = mutation({
  args: {
    levelId: v.id("levels"),
    difficultyName: v.string(),
    questionType: v.union(
      v.literal("mcq"),
      v.literal("grid"),
      v.literal("map"),
      v.literal("select"),
      v.literal("match"),
      v.literal("speaking"),
      v.literal("make_sentence"),
      v.literal("fill_in_the_blanks"),
    ),
    question: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Validate level exists
    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    // Validate difficulty exists
    if (!level.difficulties.some((d) => d.name === args.difficultyName)) {
      throw new ConvexError("Difficulty not found");
    }

    // Determine order: last + 1
    const existing = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level_difficulty", (q) =>
        q.eq("levelId", args.levelId).eq("difficultyName", args.difficultyName),
      )
      .collect();

    const maxOrder = existing.reduce(
      (max, q) => Math.max(max, q.order ?? 0),
      0,
    );

    // Generate unique question code
    const questionCode = await generateUniqueQuestionCode(ctx);

    const questionId = await ctx.db.insert("levelQuestions", {
      levelId: args.levelId,
      difficultyName: args.difficultyName,
      questionType: args.questionType,
      question: args.question,
      data: args.data,
      order: maxOrder + 1,
      status: "active",
      questionCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update level counts
    const currentCounts = level.questionCounts ?? {};
    const newCount = (currentCounts[args.difficultyName] || 0) + 1;

    await ctx.db.patch(args.levelId, {
      questionCounts: {
        ...currentCounts,
        [args.difficultyName]: newCount,
      },
      totalQuestions: (level.totalQuestions ?? 0) + 1,
      updatedAt: Date.now(),
    });

    return questionId;
  },
});

// Update a question
export const updateQuestion = mutation({
  args: {
    questionId: v.id("levelQuestions"),
    question: v.optional(v.string()),
    data: v.optional(v.any()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { questionId, ...updates } = args;
    const filteredUpdates: any = { updatedAt: Date.now() };

    if (updates.question !== undefined)
      filteredUpdates.question = updates.question;
    if (updates.data !== undefined) filteredUpdates.data = updates.data;
    if (updates.status !== undefined) filteredUpdates.status = updates.status;

    await ctx.db.patch(questionId, filteredUpdates);
  },
});

// Delete a question
export const deleteQuestion = mutation({
  args: { questionId: v.id("levelQuestions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new ConvexError("Question not found");
    }

    await ctx.db.delete(args.questionId);

    // Update level counts
    const level = await ctx.db.get(question.levelId);
    if (level) {
      const currentCounts = level.questionCounts ?? {};
      const currentDiffCount = currentCounts[question.difficultyName] || 0;

      // Decrement only if greater than 0
      if (currentDiffCount > 0) {
        await ctx.db.patch(level._id, {
          questionCounts: {
            ...currentCounts,
            [question.difficultyName]: currentDiffCount - 1,
          },
          totalQuestions: Math.max(0, (level.totalQuestions ?? 0) - 1),
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// Bulk replace questions (Sync Mode for CSV Upload)
export const bulkReplaceQuestions = mutation({
  args: {
    levelId: v.id("levels"),
    questions: v.array(
      v.object({
        difficultyName: v.string(),
        questionType: v.union(
          v.literal("mcq"),
          v.literal("grid"),
          v.literal("map"),
          v.literal("select"),
          v.literal("match"),
          v.literal("speaking"),
          v.literal("make_sentence"),
          v.literal("fill_in_the_blanks"), // Added fill_in_the_blanks
        ),
        question: v.string(),
        data: v.any(),
        order: v.optional(v.number()), // For maintaining CSV order
        status: v.optional(v.union(v.literal("active"), v.literal("archived"))), // Added status
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Validate level exists
    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    // Delete all existing questions for this level
    const existingQuestions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level", (q) => q.eq("levelId", args.levelId))
      .collect();

    for (const q of existingQuestions) {
      await ctx.db.delete(q._id);
    }

    // Insert new questions
    // Note: We use the order from the CSV if provided, otherwise we rely on insertion order
    // Since insertion is sequential in the loop, created time will roughly follow CSV order
    for (const q of args.questions) {
      // Validate difficulty
      // If difficulty doesn't exist in level, we might want to auto-add it or throw error
      // Ideally validation happens on frontend, but double checking here is good practice
      // For now, we assume frontend validation ensures difficulty exists

      // For now, we assume frontend validation ensures difficulty exists

      const questionCode = await generateUniqueQuestionCode(ctx);

      await ctx.db.insert("levelQuestions", {
        levelId: args.levelId,
        difficultyName: q.difficultyName,
        questionType: q.questionType,
        question: q.question,
        questionCode,
        data: q.data,
        status: "active",
        order: q.order || Date.now() + (q.order || 0), // Use provided order or fallback
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update level counts
    const questionCounts: Record<string, number> = {};
    let totalQuestions = 0;

    args.questions.forEach((q) => {
      const diff = q.difficultyName;
      questionCounts[diff] = (questionCounts[diff] || 0) + 1;
      totalQuestions++;
    });

    await ctx.db.patch(args.levelId, {
      questionCounts,
      totalQuestions,
      updatedAt: Date.now(),
    });
  },
});

// Bulk replace questions for a specific difficulty
export const bulkReplaceDifficultyQuestions = mutation({
  args: {
    levelId: v.id("levels"),
    difficultyName: v.string(),
    questions: v.array(
      v.object({
        questionType: v.union(
          v.literal("mcq"),
          v.literal("grid"),
          v.literal("map"),
          v.literal("select"),
          v.literal("match"),
          v.literal("speaking"),
          v.literal("make_sentence"),
          v.literal("fill_in_the_blanks"),
        ),
        question: v.string(),
        data: v.any(),
        order: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Validate level exists
    const level = await ctx.db.get(args.levelId);
    if (!level) {
      throw new ConvexError("Level not found");
    }

    // Validate difficulty exists
    if (!level.difficulties.some((d) => d.name === args.difficultyName)) {
      throw new ConvexError("Difficulty not found in this level");
    }

    // Delete all existing questions for this level AND difficulty
    const existingQuestions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level_difficulty", (q) =>
        q.eq("levelId", args.levelId).eq("difficultyName", args.difficultyName),
      )
      .collect();

    for (const q of existingQuestions) {
      await ctx.db.delete(q._id);
    }

    // Insert new questions
    for (const q of args.questions) {
      const questionCode = await generateUniqueQuestionCode(ctx);

      await ctx.db.insert("levelQuestions", {
        levelId: args.levelId,
        difficultyName: args.difficultyName,
        questionType: q.questionType,
        question: q.question,
        questionCode,
        data: q.data,
        status: "active",
        order: q.order || Date.now() + (q.order || 0),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update level counts - fetch ALL questions to ensure accuracy even if previously desynced
    const allQuestions = await ctx.db
      .query("levelQuestions")
      .withIndex("by_level", (q) => q.eq("levelId", args.levelId))
      .collect();

    const questionCounts: Record<string, number> = {};
    let totalQuestions = 0;

    allQuestions.forEach((q) => {
      const diff = q.difficultyName;
      questionCounts[diff] = (questionCounts[diff] || 0) + 1;
      totalQuestions++;
    });

    await ctx.db.patch(args.levelId, {
      questionCounts,
      totalQuestions,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// SEED DATA - Demo Questions for Level 1 & 2
// ============================================

export const seedDemoLevels = mutation({
  args: {},
  handler: async (ctx) => {
    // NOTE: This function intentionally skips auth for initial seeding
    // It can only run once (checks for existing levels)

    // Check if levels already exist
    const existingLevels = await ctx.db
      .query("levels")
      .withIndex("by_level_number")
      .collect();

    if (existingLevels.length > 0) {
      throw new ConvexError(
        "Levels already exist. Delete them first to re-seed.",
      );
    }

    const now = Date.now();
    const defaultDifficulties = [
      { name: "easy", displayName: "Easy", requiredScore: 75, order: 1 },
      { name: "medium", displayName: "Medium", requiredScore: 55, order: 2 },
      { name: "hard", displayName: "Hard", requiredScore: 30, order: 3 },
    ];

    // Helper to insert with code
    const insertQuestion = async (data: any) => {
      const questionCode = await generateUniqueQuestionCode(ctx);
      await ctx.db.insert("levelQuestions", { ...data, questionCode });
    };

    // ==================== LEVEL 1 ====================
    const level1Id = await ctx.db.insert("levels", {
      levelNumber: 1,
      name: "The Beginning",
      description: "Start your learning journey!",
      isEnabled: true, // Level 1 enabled by default
      difficulties: defaultDifficulties,
      theme: { emoji: "🌟", color: "#4CAF50" },
      createdAt: now,
      updatedAt: now,
    });

    // Level 1 - Easy Questions
    await insertQuestion({
      levelId: level1Id,
      difficultyName: "easy",
      questionType: "mcq",
      question: "What is the capital of India?",
      data: {
        options: ["Mumbai", "Delhi", "Kolkata", "Chennai"],
        correctIndex: 1,
        explanation: "New Delhi is the capital of India.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "easy",
      questionType: "select",
      question: "Select the vowel from these letters",
      data: {
        statement: "B C A D E F",
        correctWords: ["A", "E"],
        selectMode: "multiple",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "easy",
      questionType: "mcq",
      question: "How many days are in a week?",
      data: {
        options: ["5", "6", "7", "8"],
        correctIndex: 2,
        explanation: "A week has 7 days.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Level 1 - Medium Questions
    await insertQuestion({
      levelId: level1Id,
      difficultyName: "medium",
      questionType: "grid",
      question: "Find the word that means 'happy'",
      data: { solution: "glad" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "medium",
      questionType: "select",
      question: "Find the noun in this sentence",
      data: {
        statement: "The cat sat on the mat",
        correctWords: ["cat", "mat"],
        selectMode: "multiple",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "medium",
      questionType: "mcq",
      question: "Which planet is known as the Red Planet?",
      data: {
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctIndex: 1,
        explanation:
          "Mars is called the Red Planet due to its reddish appearance.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Level 1 - Hard Questions
    await insertQuestion({
      levelId: level1Id,
      difficultyName: "hard",
      questionType: "map",
      question: "Find Maharashtra on the map",
      data: { solution: "IN-MH", mapType: "india" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "hard",
      questionType: "grid",
      question: "Find the word meaning 'very large'",
      data: { solution: "huge" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level1Id,
      difficultyName: "hard",
      questionType: "select",
      question: "Select all verbs from the sentence",
      data: {
        statement: "She runs and jumps every morning",
        correctWords: ["runs", "jumps"],
        selectMode: "multiple",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    // ==================== LEVEL 2 ====================
    const level2Id = await ctx.db.insert("levels", {
      levelNumber: 2,
      name: "Word Explorer",
      description: "Expand your vocabulary!",
      isEnabled: true, // Enabled for demo
      difficulties: defaultDifficulties,
      theme: { emoji: "📚", color: "#2196F3" },
      createdAt: now,
      updatedAt: now,
    });

    // Level 2 - Easy Questions
    await insertQuestion({
      levelId: level2Id,
      difficultyName: "easy",
      questionType: "mcq",
      question: "What is the opposite of 'hot'?",
      data: {
        options: ["Warm", "Cold", "Cool", "Mild"],
        correctIndex: 1,
        explanation: "Cold is the opposite of hot.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "easy",
      questionType: "select",
      question: "Select the consonants",
      data: {
        statement: "A B C D E",
        correctWords: ["B", "C", "D"],
        selectMode: "multiple",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "easy",
      questionType: "mcq",
      question: "Which is the largest animal on Earth?",
      data: {
        options: ["Elephant", "Blue Whale", "Giraffe", "Shark"],
        correctIndex: 1,
        explanation: "The Blue Whale is the largest animal on Earth.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Level 2 - Medium Questions
    await insertQuestion({
      levelId: level2Id,
      difficultyName: "medium",
      questionType: "grid",
      question: "Find a word meaning 'to look at'",
      data: { solution: "view" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "medium",
      questionType: "map",
      question: "Find Kerala on the map",
      data: { solution: "IN-KL", mapType: "india" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "medium",
      questionType: "select",
      question: "Find the adjective in this sentence",
      data: {
        statement: "The quick brown fox jumps",
        correctWords: ["quick", "brown"],
        selectMode: "multiple",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Level 2 - Hard Questions
    await insertQuestion({
      levelId: level2Id,
      difficultyName: "hard",
      questionType: "mcq",
      question: "What is the chemical symbol for gold?",
      data: {
        options: ["Go", "Gd", "Au", "Ag"],
        correctIndex: 2,
        explanation: "Au (from Latin 'aurum') is the chemical symbol for gold.",
      },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "hard",
      questionType: "grid",
      question: "Find a word meaning 'brave'",
      data: { solution: "bold" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    await insertQuestion({
      levelId: level2Id,
      difficultyName: "hard",
      questionType: "map",
      question: "Find Uttar Pradesh on the map",
      data: { solution: "IN-UP", mapType: "india" },
      status: "active",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    return {
      message: "Created 2 demo levels with 9 questions each",
      level1Id,
      level2Id,
    };
  },
});
