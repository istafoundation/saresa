import { internalMutation } from "./_generated/server";

export const backfillLevelCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const levels = await ctx.db.query("levels").collect();

    for (const level of levels) {
      const questions = await ctx.db
        .query("levelQuestions")
        .withIndex("by_level", (q) => q.eq("levelId", level._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const questionCounts: Record<string, number> = {};
      questions.forEach((q) => {
        questionCounts[q.difficultyName] = (questionCounts[q.difficultyName] || 0) + 1;
      });

      await ctx.db.patch(level._id, {
        questionCounts,
        totalQuestions: questions.length,
      });
    }

    return `Backfilled ${levels.length} levels`;
  },
});
