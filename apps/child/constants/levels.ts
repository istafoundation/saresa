// Level progression system with artifact unlocks
// XP formula: xpRequired = baseXP * (multiplier ^ (level - 1))

export interface LevelInfo {
  level: number;
  xpRequired: number;
  title: string;
  artifactId: string | null;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, xpRequired: 0, title: "Curious Seeker", artifactId: null },
  { level: 2, xpRequired: 100, title: "Apprentice Detective", artifactId: "ganesha-wisdom" },
  { level: 3, xpRequired: 250, title: "Mystery Hunter", artifactId: "hanuman-strength" },
  { level: 4, xpRequired: 450, title: "Legend Tracker", artifactId: "krishna-flute" },
  { level: 5, xpRequired: 700, title: "Myth Unraveler", artifactId: "arjuna-bow" },
  { level: 6, xpRequired: 1000, title: "Ancient Scholar", artifactId: "shiva-trident" },
  { level: 7, xpRequired: 1400, title: "Story Keeper", artifactId: "durga-lion" },
  { level: 8, xpRequired: 1900, title: "Lore Master", artifactId: "rama-arrow" },
  { level: 9, xpRequired: 2500, title: "Epic Chronicler", artifactId: "vishnu-chakra" },
  { level: 10, xpRequired: 3200, title: "Divine Detective", artifactId: "lakshmi-lotus" },
  { level: 11, xpRequired: 4000, title: "Celestial Sage", artifactId: null },
  { level: 12, xpRequired: 5000, title: "Cosmic Guardian", artifactId: null },
  { level: 13, xpRequired: 6200, title: "Eternal Seeker", artifactId: null },
  { level: 14, xpRequired: 7600, title: "Mythic Voyager", artifactId: null },
  { level: 15, xpRequired: 9200, title: "Legend Incarnate", artifactId: null },
  { level: 16, xpRequired: 11000, title: "Avatar of Knowledge", artifactId: null },
  { level: 17, xpRequired: 13000, title: "Timeless Scholar", artifactId: null },
  { level: 18, xpRequired: 15500, title: "Immortal Detective", artifactId: null },
  { level: 19, xpRequired: 18500, title: "Cosmic Chronicler", artifactId: null },
  { level: 20, xpRequired: 22000, title: "Supreme Sage", artifactId: null },
];

export function getLevelForXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getXPProgressToNextLevel(xp: number): { current: number; required: number; percentage: number } {
  const currentLevel = getLevelForXP(xp);
  const nextLevel = LEVELS[currentLevel.level]; // level is 1-indexed, array is 0-indexed
  
  if (!nextLevel) {
    return { current: 0, required: 0, percentage: 100 }; // Max level
  }
  
  const xpIntoCurrentLevel = xp - currentLevel.xpRequired;
  const xpRequiredForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  
  return {
    current: xpIntoCurrentLevel,
    required: xpRequiredForNextLevel,
    percentage: (xpIntoCurrentLevel / xpRequiredForNextLevel) * 100,
  };
}
