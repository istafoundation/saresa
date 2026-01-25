// Theme constants for Detective Mythology app
// ✨ Kids-Friendly Magical Theme - Bright, playful, and fun!

export const COLORS = {
  // Primary palette - Magical Pink
  primary: '#FF69B4',       // Hot pink (magical)
  primaryDark: '#FF1493',   // Deep pink
  primaryLight: '#FFB6D9',  // Soft pink
  
  // Accent - Sky Blue & Gold
  accent: '#00BFFF',        // Sky blue (magical)
  accentGold: '#FFD700',    // Sparkling gold for stars
  accentLight: '#87CEEB',   // Light sky blue
  
  // Background - Bright & Cheerful
  background: '#FFF0F6',    // Light bubblegum pink
  backgroundLight: '#FFF5FA', // Even lighter pink
  backgroundCard: '#FFFFFF', // Clean white cards
  
  // Surface colors
  surface: '#FFF8FB',       // Soft rose white
  surfaceLight: '#FFFFFF',  // Pure white
  
  // Rainbow/Magical accent colors
  rainbow1: '#FF6B6B',      // Coral red
  rainbow2: '#4ECDC4',      // Teal
  rainbow3: '#FFE66D',      // Sunny yellow
  rainbow4: '#C792EA',      // Lavender
  rainbow5: '#7FDBFF',      // Light blue
  rainbow6: '#98D8C8',      // Mint green
  sparkle: '#FFD700',       // Gold sparkle
  
  // Text - Readable on light backgrounds
  text: '#4A3F6B',          // Soft dark purple
  textSecondary: '#7B6F99',
  textMuted: '#A599C4',
  
  // Semantic colors - Bright & cheerful
  success: '#4ADE80',       // Bright green
  error: '#FF6B8A',         // Soft coral (less scary)
  warning: '#FFBE5C',       // Warm orange
  
  // Rarity colors (for weapon cards) - More vibrant
  rarityCommon: '#A8D8EA',    // Soft blue
  rarityRare: '#6C8EBF',      // Royal blue
  rarityEpic: '#C792EA',      // Lavender purple
  
  // Wordle colors - Kid-friendly
  wordleCorrect: '#4ADE80',   // Bright green
  wordlePresent: '#FFD93D',   // Sunny yellow
  wordleAbsent: '#D4D4D8',    // Light gray
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Will load custom fonts in app
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  sparkle: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

// XP & Level configuration
export const LEVEL_CONFIG = {
  baseXP: 100,
  multiplier: 1.5,
  maxLevel: 20,
};

// Animation durations in ms
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
  bounce: 600,       // For bouncy button effects
  sparkle: 1200,     // For sparkle/twinkle animations
  float: 3000,       // For floating elements
};
