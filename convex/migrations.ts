import { mutation } from "./_generated/server";

export const clearUsers = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let count = 0;
    for (const user of users) {
      await ctx.db.delete(user._id);
      count++;
    }
    return `Deleted ${count} users.`;
  },
});
// Backfill order for questions that don't have it
export const backfillQuestionOrders = mutation({
  handler: async (ctx) => {
    // Get all questions
    const questions = await ctx.db.query("levelQuestions").collect();
    
    // Group by level + difficulty
    const grouped: Record<string, typeof questions> = {};
    
    for (const q of questions) {
      if (q.order !== undefined) continue; // Skip if already has order
      
      const key = `${q.levelId}_${q.difficultyName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(q);
    }
    
    let updatedCount = 0;
    
    // Process each group
    for (const group of Object.values(grouped)) {
      // Sort by createdAt (default legacy order)
      group.sort((a, b) => a.createdAt - b.createdAt);
      
      // Update each with index + 1
      for (let i = 0; i < group.length; i++) {
        const q = group[i];
        await ctx.db.patch(q._id, { order: i + 1 });
        updatedCount++;
      }
    }
    
    return `Backfilled order for ${updatedCount} questions.`;
  },
});
