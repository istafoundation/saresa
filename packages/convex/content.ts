import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// ============================================
// CONTENT TYPE DEFINITIONS
// ============================================

// Wordle content structure
export const wordleContentValidator = v.object({
  word: v.string(),
  hint: v.string(),
});

// Word Finder - Easy mode word set
export const wordSetContentValidator = v.object({
  theme: v.string(),
  words: v.array(v.string()),
});

// Word Finder - Hard mode question
export const hardQuestionContentValidator = v.object({
  question: v.string(),
  answer: v.string(),
  hint: v.string(),
});

// English Insane (GK) question
export const gkQuestionContentValidator = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correctIndex: v.number(),
  category: v.string(),
  explanation: v.string(),
});

// Grammar Detective (Parts of Speech) question
export const posQuestionContentValidator = v.object({
  sentence: v.string(),
  words: v.array(v.string()),
  questionText: v.string(),
  correctIndices: v.array(v.number()),
  explanation: v.string(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify admin status (parents can manage content)
async function requireAdmin(ctx: any): Promise<Id<"parents">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  if (!parent) throw new ConvexError("Not authorized - admin access required");
  return parent._id;
}

// Generate a unique code for content
// English Insane: EI + 6 digits (e.g., EI123456)
// Others: 6 digits
async function generateUniqueContentCode(ctx: any, gameId: string): Promise<string> {
  const prefix = gameId === 'english-insane' ? 'EI' : '';
  const generate = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${num}`;
  };
  
  let code = generate();
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await ctx.db
      .query("gameContent")
      .withIndex("by_question_code", (q: any) => q.eq("questionCode", code))
      .first();
    
    if (!existing) {
      isUnique = true;
    } else {
      code = generate();
      attempts++;
    }
  }

  if (!isUnique) throw new ConvexError("Failed to generate unique content code");
  return code;
}

// Generate checksum for content array
function generateChecksum(content: any[]): string {
  const str = JSON.stringify(content.map(c => ({ id: c._id, v: c.version })));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Validate content data based on type
function validateContentData(type: string, data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  switch (type) {
    case 'wordle_word':
      if (!data.word || typeof data.word !== 'string') {
        return { valid: false, error: 'Word is required' };
      }
      if (data.word.length !== 5) {
        return { valid: false, error: 'Word must be exactly 5 letters' };
      }
      if (!/^[A-Z]+$/.test(data.word.toUpperCase())) {
        return { valid: false, error: 'Word must contain only letters A-Z' };
      }
      if (!data.hint || typeof data.hint !== 'string' || data.hint.trim().length === 0) {
        return { valid: false, error: 'Hint is required' };
      }
      break;

    case 'word_set':
      if (!data.theme || typeof data.theme !== 'string' || data.theme.trim().length === 0) {
        return { valid: false, error: 'Theme is required' };
      }
      if (!Array.isArray(data.words) || data.words.length !== 5) {
        return { valid: false, error: 'Exactly 5 words are required' };
      }
      for (const word of data.words) {
        if (typeof word !== 'string' || word.length === 0 || word.length > 6) {
          return { valid: false, error: 'Each word must be 1-6 characters' };
        }
      }
      break;

    case 'hard_question':
      if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
        return { valid: false, error: 'Question is required' };
      }
      if (!data.answer || typeof data.answer !== 'string' || data.answer.trim().length === 0) {
        return { valid: false, error: 'Answer is required' };
      }
      if (data.answer.length > 6) {
        return { valid: false, error: 'Answer must be 6 characters or less' };
      }
      break;

    case 'gk_question':
      if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
        return { valid: false, error: 'Question is required' };
      }
      if (!Array.isArray(data.options) || data.options.length !== 4) {
        return { valid: false, error: 'Exactly 4 options are required' };
      }
      for (const opt of data.options) {
        if (typeof opt !== 'string' || opt.trim().length === 0) {
          return { valid: false, error: 'All options must be non-empty strings' };
        }
      }
      // Check for duplicate options
      const uniqueOptions = new Set(data.options.map((o: string) => o.toLowerCase().trim()));
      if (uniqueOptions.size !== 4) {
        return { valid: false, error: 'Options must be unique' };
      }
      if (typeof data.correctIndex !== 'number' || data.correctIndex < 0 || data.correctIndex > 3) {
        return { valid: false, error: 'correctIndex must be 0-3' };
      }
      if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length === 0) {
        return { valid: false, error: 'Explanation is required' };
      }
      break;

    // New Types - Reuse similar validation where appropriate
    case 'mcq':
      if (!data.question && typeof data.question !== 'string') return { valid: false, error: 'Question is required' };
      if (!data.options || !Array.isArray(data.options)) return { valid: false, error: 'Options array is required' };
       // allow slight variance from gk_question (e.g. maybe no category)
      break;
    
    case 'grid':
    case 'map':
    case 'select':
    case 'match':
    case 'speaking':
    case 'make_sentence':
    case 'fill_in_the_blanks':
       // For now, just ensure data is an object. 
       // We trust the admin/frontend for complex types until we have specific rules.
       if (!data) return { valid: false, error: 'Data object is required' };
       break;
      
    case 'pos_question':
      if (!data.sentence || typeof data.sentence !== 'string' || data.sentence.trim().length === 0) {
        return { valid: false, error: 'Sentence is required' };
      }
      if (!Array.isArray(data.words) || data.words.length === 0) {
        return { valid: false, error: 'Words array is required' };
      }
      if (!data.questionText || typeof data.questionText !== 'string' || data.questionText.trim().length === 0) {
        return { valid: false, error: 'Question text is required' };
      }
      if (!Array.isArray(data.correctIndices) || data.correctIndices.length === 0) {
        return { valid: false, error: 'At least one correct index is required' };
      }
      for (const idx of data.correctIndices) {
        if (typeof idx !== 'number' || idx < 0 || idx >= data.words.length) {
          return { valid: false, error: 'Correct indices must be valid word indices' };
        }
      }
      if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length === 0) {
        return { valid: false, error: 'Explanation is required' };
      }
      break;

    default:
      return { valid: false, error: 'Unknown content type' };
  }

  return { valid: true };
}

// ============================================
// DAILY WORDLE WORD (OTA Selection)
// ============================================

// Get today's Wordle word - same for all users, based on IST date
export const getTodaysWordleWord = query({
  args: {},
  handler: async (ctx) => {
    // Get all active wordle words
    const allWords = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => 
        q.eq("gameId", "wordle").eq("status", "active")
      )
      .filter((q) => q.eq(q.field("type"), "wordle_word"))
      .collect();

    if (allWords.length === 0) {
      // Fallback if no words in database
      return { word: "ABOUT", hint: "Concerning or regarding something" };
    }

    // Calculate day index using IST (UTC+5:30)
    const startDate = new Date('2024-01-01').getTime();
    const now = Date.now();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now + istOffset);
    const todayStr = istNow.toISOString().split('T')[0];
    const today = new Date(todayStr).getTime();
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    // Deterministically select word for today
    const wordIndex = daysSinceStart % allWords.length;
    const todaysContent = allWords[wordIndex];
    const data = todaysContent.data as { word: string; hint: string };
    
    return {
      word: data.word,
      hint: data.hint,
    };
  },
});

// ============================================
// CONTENT QUERIES (Public - for games)
// ============================================

// Get active content for a game (used by mobile app)
export const getGameContent = query({
  args: {
    gameId: v.string(),
    type: v.optional(v.union(
      v.literal("wordle_word"),
      v.literal("word_set"),
      v.literal("hard_question"),
      v.literal("gk_question"),
      v.literal("pos_question")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => 
        q.eq("gameId", args.gameId).eq("status", "active")
      );

    const allContent = await query.collect();
    
    // Filter by type if specified
    let filtered = args.type 
      ? allContent.filter(c => c.type === args.type)
      : allContent;
    
    // Always filter out scheduled content that's not yet valid
    const now = Date.now();
    return filtered.filter(c => {
      if (c.validFrom && c.validFrom > now) return false;
      if (c.validUntil && c.validUntil < now) return false;
      return true;
    });
  },
});

/**
 * OPTIMIZED: Get content AND version in a single query
 * Reduces 2 subscriptions to 1 per game, cutting subscription overhead by 50%
 */
export const getGameContentWithVersion = query({
  args: {
    gameId: v.string(),
    type: v.optional(v.union(
      v.literal("wordle_word"),
      v.literal("word_set"),
      v.literal("hard_question"),
      v.literal("gk_question"),
      v.literal("pos_question"),
      // New types
      v.literal("mcq"),
      v.literal("grid"),
      v.literal("map"),
      v.literal("select"),
      v.literal("match"),
      v.literal("speaking"),
      v.literal("make_sentence"),
      v.literal("fill_in_the_blanks")
    )),
  },
  handler: async (ctx, args) => {
    // Fetch content
    let query = ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => 
        q.eq("gameId", args.gameId).eq("status", "active")
      );

    const allContent = await query.collect();
    
    // Filter by type if specified
    let filtered = args.type 
      ? allContent.filter(c => c.type === args.type)
      : allContent;
    
    // Filter out scheduled content that's not yet valid
    const now = Date.now();
    const content = filtered.filter(c => {
      if (c.validFrom && c.validFrom > now) return false;
      if (c.validUntil && c.validUntil < now) return false;
      return true;
    });

    // Fetch version
    const latestVersion = await ctx.db
      .query("contentVersions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first();

    return {
      content,
      version: latestVersion?.version ?? 0,
      checksum: latestVersion?.checksum ?? "",
    };
  },
});

// Get current content version for a game (for cache validation)
export const getContentVersion = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const latestVersion = await ctx.db
      .query("contentVersions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first();

    return latestVersion ?? { version: 0, checksum: "" };
  },
});

// Get content since a specific version (for delta sync)
export const getContentSince = query({
  args: {
    gameId: v.string(),
    sinceVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => 
        q.eq("gameId", args.gameId).eq("status", "active")
      )
      .collect();

    // Return only content updated after the specified version
    return content.filter(c => c.version > args.sinceVersion);
  },
});

// Get active content packs for a game
export const getActiveContentPacks = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const packs = await ctx.db
      .query("contentPacks")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    return packs.filter(pack => {
      if (!pack.isActive) return false;
      if (pack.activationType === "scheduled") {
        if (pack.startDate && pack.startDate > now) return false;
        if (pack.endDate && pack.endDate < now) return false;
      }
      return true;
    }).sort((a, b) => b.priority - a.priority);
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

// Get all content for admin management (includes drafts)
export const getAllContent = query({
  args: {
    gameId: v.string(),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("scheduled"),
      v.literal("archived")
    )),
  },
  handler: async (ctx, args) => {
    // Note: In production, add admin check here
    let allContent = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => {
        if (args.status) {
          return q.eq("gameId", args.gameId).eq("status", args.status);
        }
        return q.eq("gameId", args.gameId);
      })
      .collect();

    // If no status filter, get all statuses
    if (!args.status) {
      allContent = await ctx.db
        .query("gameContent")
        .collect();
      allContent = allContent.filter(c => c.gameId === args.gameId);
    }

    return allContent.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Search content by code or text (for admin)
export const searchContentAdmin = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    if (!args.query) return [];
    
    // Exact match on code (case insensitive could be added if needed, but strict for now)
    // Try both exact and uppercase since prefixes are likely uppercase
    const query = args.query.trim();
    
    const codeMatches = await ctx.db
      .query("gameContent")
      .withIndex("by_question_code", (q) => q.eq("questionCode", query))
      .collect();
      
    if (codeMatches.length > 0) return codeMatches;
    
    // Also try uppercase if user typed "ei..."
    const upperQuery = query.toUpperCase();
    if (upperQuery !== query) {
      const upperMatches = await ctx.db
        .query("gameContent")
        .withIndex("by_question_code", (q) => q.eq("questionCode", upperQuery))
        .collect();
      if (upperMatches.length > 0) return upperMatches;
    }

    return [];
  },
});

// Get content analytics
export const getContentAnalytics = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentAnalytics")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Get all content packs for admin
export const getAllContentPacks = query({
  args: { gameId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.gameId !== undefined) {
      return await ctx.db
        .query("contentPacks")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId as string))
        .collect();
    }
    return await ctx.db.query("contentPacks").collect();
  },
});



// ============================================
// ADMIN MUTATIONS
// ============================================

// Add new content
export const addContent = mutation({
  args: {
    type: v.union(
      v.literal("wordle_word"),
      v.literal("word_set"),
      v.literal("hard_question"),
      v.literal("gk_question"),
      v.literal("pos_question"),
      // New types
      v.literal("mcq"),
      v.literal("grid"),
      v.literal("map"),
      v.literal("select"),
      v.literal("match"),
      v.literal("speaking"),
      v.literal("make_sentence"),
      v.literal("fill_in_the_blanks")
    ),
    gameId: v.string(),
    data: v.any(),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("scheduled")
    )),
    tags: v.optional(v.array(v.string())),
    packId: v.optional(v.string()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    // Validate content data
    const validation = validateContentData(args.type, args.data);
    if (!validation.valid) {
      throw new ConvexError(validation.error ?? "Invalid content data");
    }

    // Check for duplicate content (for wordle words)
    if (args.type === 'wordle_word' && args.data.word) {
      const existing = await ctx.db
        .query("gameContent")
        .withIndex("by_game_status", (q) => 
          q.eq("gameId", args.gameId).eq("status", "active")
        )
        .collect();
      
      const duplicate = existing.find(
        (c) => c.type === 'wordle_word' && 
               (c.data as any)?.word?.toUpperCase() === args.data.word.toUpperCase()
      );
      
      if (duplicate) {
        throw new ConvexError(`Word "${args.data.word}" already exists`);
      }
    }

    // Get current version for this game
    const latestVersion = await ctx.db
      .query("contentVersions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first();

    const version = (latestVersion?.version ?? 0) + 1;




    // Generate unique code for this content
    const questionCode = await generateUniqueContentCode(ctx, args.gameId);

    const contentId = await ctx.db.insert("gameContent", {
      type: args.type,
      gameId: args.gameId,
      data: args.data,
      status: args.status ?? "draft",
      version,
      tags: args.tags ?? [],
      packId: args.packId,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      priority: args.priority ?? 0,
      questionCode,
      createdBy: adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { contentId, version };
  },
});

// Update existing content
export const updateContent = mutation({
  args: {
    contentId: v.id("gameContent"),
    data: v.optional(v.any()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("scheduled"),
      v.literal("archived")
    )),
    tags: v.optional(v.array(v.string())),
    packId: v.optional(v.string()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new ConvexError("Content not found");

    // Get current version for this game
    const latestVersion = await ctx.db
      .query("contentVersions")
      .withIndex("by_game", (q) => q.eq("gameId", content.gameId))
      .order("desc")
      .first();

    const newVersion = (latestVersion?.version ?? 0) + 1;

    const updates: Record<string, any> = {
      version: newVersion,
      updatedAt: Date.now(),
    };

    if (args.data !== undefined) updates.data = args.data;
    if (args.status !== undefined) updates.status = args.status;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.packId !== undefined) updates.packId = args.packId;
    if (args.validFrom !== undefined) updates.validFrom = args.validFrom;
    if (args.validUntil !== undefined) updates.validUntil = args.validUntil;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.contentId, updates);

    return { success: true, version: newVersion };
  },
});

// Archive content (soft delete)
export const archiveContent = mutation({
  args: { contentId: v.id("gameContent") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.contentId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Bulk add content (for migration/import)
export const bulkAddContent = mutation({
  args: {
    items: v.array(v.object({
      type: v.union(
        v.literal("wordle_word"),
        v.literal("word_set"),
        v.literal("hard_question"),
        v.literal("gk_question"),
        v.literal("pos_question"),
        // New types
        v.literal("mcq"),
        v.literal("grid"),
        v.literal("map"),
        v.literal("select"),
        v.literal("match"),
        v.literal("speaking"),
        v.literal("make_sentence"),
        v.literal("fill_in_the_blanks")
      ),
      gameId: v.string(),
      data: v.any(),
      tags: v.optional(v.array(v.string())),
      priority: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    // Group by gameId to manage versions
    const gameVersions: Record<string, number> = {};

    for (const item of args.items) {
      if (!gameVersions[item.gameId]) {
        const latestVersion = await ctx.db
          .query("contentVersions")
          .withIndex("by_game", (q) => q.eq("gameId", item.gameId))
          .order("desc")
          .first();
        gameVersions[item.gameId] = (latestVersion?.version ?? 0) + 1;
      }

      // Generate code for each item
      const questionCode = await generateUniqueContentCode(ctx, item.gameId);

      await ctx.db.insert("gameContent", {
        type: item.type,
        gameId: item.gameId,
        data: item.data,
        status: "active",
        version: gameVersions[item.gameId],
        tags: item.tags ?? [],
        priority: item.priority ?? 0,
        questionCode,
        createdBy: adminId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, count: args.items.length };
  },
});

// Publish a new content version (creates version checkpoint)
export const publishVersion = mutation({
  args: {
    gameId: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get all active content for this game
    const activeContent = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => 
        q.eq("gameId", args.gameId).eq("status", "active")
      )
      .collect();

    // Get latest version
    const latestVersion = await ctx.db
      .query("contentVersions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first();

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // Create version record
    await ctx.db.insert("contentVersions", {
      gameId: args.gameId,
      version: newVersion,
      publishedAt: Date.now(),
      description: args.description,
      contentCount: activeContent.length,
      checksum: generateChecksum(activeContent),
    });

    return { version: newVersion, contentCount: activeContent.length };
  },
});

// ============================================
// CONTENT PACK MUTATIONS
// ============================================

// Create content pack
export const createContentPack = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    gameId: v.string(),
    activationType: v.union(
      v.literal("always"),
      v.literal("scheduled"),
      v.literal("manual")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    priority: v.optional(v.number()),
    theme: v.optional(v.object({
      primaryColor: v.string(),
      iconEmoji: v.string(),
      specialEffect: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const packId = await ctx.db.insert("contentPacks", {
      name: args.name,
      description: args.description,
      gameId: args.gameId,
      activationType: args.activationType,
      isActive: args.activationType === "always",
      startDate: args.startDate,
      endDate: args.endDate,
      priority: args.priority ?? 0,
      theme: args.theme,
      createdAt: Date.now(),
    });

    return { packId };
  },
});

// Toggle content pack active status
export const toggleContentPack = mutation({
  args: {
    packId: v.id("contentPacks"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.packId, { isActive: args.isActive });

    return { success: true };
  },
});

// ============================================
// ANALYTICS MUTATIONS
// ============================================

// Record content usage (called from games)
export const recordContentUsage = mutation({
  args: {
    contentId: v.id("gameContent"),
    completed: v.boolean(),
    success: v.boolean(),
    timeSpent: v.number(), // milliseconds
  },
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    if (!content) return;

    // Get or create analytics record
    let analytics = await ctx.db
      .query("contentAnalytics")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .first();

    if (!analytics) {
      // Create new analytics record
      await ctx.db.insert("contentAnalytics", {
        contentId: args.contentId,
        gameId: content.gameId,
        timesShown: 1,
        timesCompleted: args.completed ? 1 : 0,
        successRate: args.success ? 1.0 : 0.0,
        avgTimeSpent: args.timeSpent,
        skipCount: args.completed ? 0 : 1,
        calculatedDifficulty: "medium",
        lastUpdated: Date.now(),
      });
    } else {
      // Update existing analytics
      const newTimesShown = analytics.timesShown + 1;
      const newTimesCompleted = analytics.timesCompleted + (args.completed ? 1 : 0);
      const newSuccessRate = args.success
        ? (analytics.successRate * analytics.timesShown + 1) / newTimesShown
        : (analytics.successRate * analytics.timesShown) / newTimesShown;
      const newAvgTime = (analytics.avgTimeSpent * analytics.timesShown + args.timeSpent) / newTimesShown;
      const newSkipCount = analytics.skipCount + (args.completed ? 0 : 1);

      // Calculate difficulty based on success rate
      let calculatedDifficulty: "easy" | "medium" | "hard" = "medium";
      if (newSuccessRate >= 0.75) calculatedDifficulty = "easy";
      else if (newSuccessRate <= 0.25) calculatedDifficulty = "hard";

      await ctx.db.patch(analytics._id, {
        timesShown: newTimesShown,
        timesCompleted: newTimesCompleted,
        successRate: newSuccessRate,
        avgTimeSpent: newAvgTime,
        skipCount: newSkipCount,
        calculatedDifficulty,
        lastUpdated: Date.now(),
      });
    }
  },
});
