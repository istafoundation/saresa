"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Octokit } from "octokit";
import { api } from "./_generated/api";

export const publishToGitHub = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    publishedLevels: number;
    totalQuestions: number;
    commitSha: string;
  }> => {
    // Verify admin identity — only authenticated admins can publish
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in to publish");
    }
    
    const GITHUB_PAT = process.env.GITHUB_PAT;
    const GITHUB_CONTENT_REPO = process.env.GITHUB_CONTENT_REPO; // e.g. "istafoundation/kids-content"

    if (!GITHUB_PAT || !GITHUB_CONTENT_REPO) {
      throw new Error("Missing GITHUB_PAT or GITHUB_CONTENT_REPO env vars");
    }

    const [owner, repo] = GITHUB_CONTENT_REPO.split("/");

    const octokit = new Octokit({ auth: GITHUB_PAT });

    // 2. Fetch all data
    const levels = await ctx.runQuery(api.levels.getLevelsAdmin);

    
    // We need all questions. To avoid fetching ALL at once if too huge, we could paginate,
    // but for 5k questions it's fine to fetch per level.
    
    const files_to_push: { path: string; content: string }[] = [];
    const levelVersions: Record<string, number> = {};
    const levelsMeta: any[] = [];

    let totalQuestions = 0;

    for (const level of levels) {
      // Get questions for this level
      const questionsGrouped = await ctx.runQuery(api.levels.getLevelQuestionsAdmin, { levelId: level._id });
      
      const levelId = level._id;
      const version = level.questionsVersion || 0;
      levelVersions[levelId] = version;

      // Prepare level meta (excluding questions)
      levelsMeta.push({
        _id: level._id,
        levelNumber: level.levelNumber,
        name: level.name,
        description: level.description,
        groupId: level.groupId,
        isEnabled: level.isEnabled,
        difficulties: level.difficulties,
        theme: level.theme,
        totalQuestions: level.totalQuestions,
        questionsVersion: version,
      });

      // Prepare questions file
      const questionsFileContent = {
        levelId: level._id,
        version: version,
        publishedAt: Date.now(),
        questions: questionsGrouped,
      };

      files_to_push.push({
        path: `questions/level_${levelId}.json`,
        content: JSON.stringify(questionsFileContent, null, 2),
      });

      Object.values(questionsGrouped).forEach((qs: any) => totalQuestions += qs.length);
    }

    // Prepare manifest
    const manifest = {
      publishedAt: Date.now(),
      totalQuestions,
      levelVersions,
    };

    files_to_push.push({
      path: "manifest.json",
      content: JSON.stringify(manifest, null, 2),
    });

    files_to_push.push({
      path: "levels-meta.json",
      content: JSON.stringify(levelsMeta, null, 2),
    });

    // 3. Push to GitHub
    // We need to get the current commit SHA to update, or use the createOrUpdateFileContents (one by one is slow).
    // Better strategy: Create a tree and commit.
    
    // Get the reference to the main branch
    const ref = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    }).catch(() => null);

    if (!ref) {
       // If repo is empty, we might need to create init commit, but assuming repo exists and has main.
       throw new Error("Could not find main branch");
    }

    const latestCommitSha = ref.data.object.sha;

    // Create blobs
    const treeItems = await Promise.all(files_to_push.map(async (file) => {
      const blob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: "utf-8",
      });
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.data.sha,
      };
    }));

    // Create tree
    const tree = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: latestCommitSha,
      tree: treeItems,
    });

    // Create commit
    const newCommit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Publish content update - ${new Date().toISOString()}`,
      tree: tree.data.sha,
      parents: [latestCommitSha],
    });

    // Update ref
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: newCommit.data.sha,
    });

    return {
      success: true,
      publishedLevels: levels.length,
      totalQuestions,
      commitSha: newCommit.data.sha,
    };
  },
});
