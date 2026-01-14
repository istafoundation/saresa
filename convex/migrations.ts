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
