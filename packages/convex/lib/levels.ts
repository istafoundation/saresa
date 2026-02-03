// Shared LEVELS configuration - Single Source of Truth
// Used by: users.ts, gameStats.ts, constants/levels.ts
// Keep this file in sync with client-side constants/levels.ts

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  artifactId: string | null;
}

// Level thresholds with artifact unlocks
// IMPORTANT: When modifying, update all consumers:
// - convex/users.ts
// - convex/gameStats.ts
// - constants/levels.ts (client-side)
export const LEVELS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, artifactId: null },
  { level: 2, xpRequired: 100, artifactId: "ganesha-wisdom" },
  { level: 3, xpRequired: 250, artifactId: "hanuman-strength" },
  { level: 4, xpRequired: 450, artifactId: "krishna-flute" },
  { level: 5, xpRequired: 700, artifactId: "arjuna-bow" },
  { level: 6, xpRequired: 1000, artifactId: "shiva-trident" },
  { level: 7, xpRequired: 1400, artifactId: "durga-lion" },
  { level: 8, xpRequired: 1900, artifactId: "rama-arrow" },
  { level: 9, xpRequired: 2500, artifactId: "vishnu-chakra" },
  { level: 10, xpRequired: 3200, artifactId: "lakshmi-lotus" },
  { level: 11, xpRequired: 4000, artifactId: null },
  { level: 12, xpRequired: 5000, artifactId: null },
  { level: 13, xpRequired: 6200, artifactId: null },
  { level: 14, xpRequired: 7600, artifactId: null },
  { level: 15, xpRequired: 9200, artifactId: null },
  { level: 16, xpRequired: 11000, artifactId: null },
  { level: 17, xpRequired: 13000, artifactId: null },
  { level: 18, xpRequired: 15500, artifactId: null },
  { level: 19, xpRequired: 18500, artifactId: null },
  { level: 20, xpRequired: 22000, artifactId: null },
];

// Valid artifact IDs (extracted from LEVELS array)
export const VALID_ARTIFACT_IDS = LEVELS
  .map(l => l.artifactId)
  .filter((id): id is string => id !== null);

// Helper function to calculate artifacts unlocked for a given XP
export function getUnlockedArtifactsForXP(
  currentXP: number, 
  currentArtifacts: string[]
): { updated: boolean; artifacts: string[] } {
  const unlockedArtifacts = [...currentArtifacts];
  let updated = false;

  for (const level of LEVELS) {
    if (currentXP >= level.xpRequired && level.artifactId) {
      if (!unlockedArtifacts.includes(level.artifactId)) {
        unlockedArtifacts.push(level.artifactId);
        updated = true;
      }
    }
  }

  return { updated, artifacts: unlockedArtifacts };
}
