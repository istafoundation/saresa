import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateLevelsToGroup1 = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Check if Group 1 exists, if not create it
    const groups = await ctx.db.query("levelGroups").collect();
    let group1Id;

    if (groups.length === 0) {
        console.log("Creating default Group 1...");
        group1Id = await ctx.db.insert("levelGroups", {
            name: "World 1",
            description: "The Beginning",
            order: 1,
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    } else {
        // Use the first group found or specifically one named "World 1"
        const g1 = groups.find(g => g.order === 1) || groups[0];
        group1Id = g1._id;
        console.log("Using existing Group:", g1.name);
    }

    // 2. Find all levels without groupId
    const levels = await ctx.db.query("levels").collect();
    let migratedCount = 0;

    for (const level of levels) {
        if (!level.groupId) {
            await ctx.db.patch(level._id, {
                groupId: group1Id,
            });
            migratedCount++;
        }
    }

    console.log(`Migrated ${migratedCount} levels to Group ${group1Id}`);
    return { success: true, migrated: migratedCount, groupId: group1Id };
  },
});
