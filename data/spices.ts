// Spices data for Let'em Cook game
// Uses placeholder images from unsplash - replace with ImageKit URLs when available

export interface Spice {
  id: string;
  name: string;
  imageUrl: string;
}

// Spice data with placeholder images
export const SPICES: Spice[] = [
  { id: 'TURMERIC', name: 'Turmeric', imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
  { id: 'CUMIN', name: 'Cumin', imageUrl: 'https://images.unsplash.com/photo-1599909533601-fc9d3d8e814c?w=400' },
  { id: 'CORIANDER', name: 'Coriander', imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
  { id: 'RED_CHILI', name: 'Red Chili', imageUrl: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400' },
  { id: 'BLACK_PEPPER', name: 'Black Pepper', imageUrl: 'https://images.unsplash.com/photo-1599909533099-e40a8b4c5e6e?w=400' },
  { id: 'CARDAMOM', name: 'Cardamom', imageUrl: 'https://images.unsplash.com/photo-1638437352798-2c54bfcc3050?w=400' },
  { id: 'CINNAMON', name: 'Cinnamon', imageUrl: 'https://images.unsplash.com/photo-1608198920389-3d8f0e503a71?w=400' },
  { id: 'CLOVES', name: 'Cloves', imageUrl: 'https://images.unsplash.com/photo-1599909533147-1d02c1b6b72b?w=400' },
  { id: 'BAY_LEAF', name: 'Bay Leaf', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
  { id: 'MUSTARD', name: 'Mustard Seeds', imageUrl: 'https://images.unsplash.com/photo-1599909533601-1e2e7e0fd2a4?w=400' },
  { id: 'FENUGREEK', name: 'Fenugreek', imageUrl: 'https://images.unsplash.com/photo-1599909532873-31d1c3d2c2e5?w=400' },
  { id: 'NUTMEG', name: 'Nutmeg', imageUrl: 'https://images.unsplash.com/photo-1599909533190-8e2e1e6e9e50?w=400' },
  { id: 'MACE', name: 'Mace', imageUrl: 'https://images.unsplash.com/photo-1599909532795-6c63e276098d?w=400' },
  { id: 'SAFFRON', name: 'Saffron', imageUrl: 'https://images.unsplash.com/photo-1599909533601-2d2e7e0fd2a4?w=400' },
  { id: 'STAR_ANISE', name: 'Star Anise', imageUrl: 'https://images.unsplash.com/photo-1599909533099-1e2e7e0fd2a4?w=400' },
  { id: 'FENNEL', name: 'Fennel Seeds', imageUrl: 'https://images.unsplash.com/photo-1599909532873-2e2e7e0fd2a5?w=400' },
  { id: 'AJWAIN', name: 'Ajwain', imageUrl: 'https://images.unsplash.com/photo-1599909533190-3e2e7e0fd2a6?w=400' },
  { id: 'ASAFOETIDA', name: 'Asafoetida', imageUrl: 'https://images.unsplash.com/photo-1599909532795-4e2e7e0fd2a7?w=400' },
  { id: 'CURRY_LEAF', name: 'Curry Leaves', imageUrl: 'https://images.unsplash.com/photo-1599909533147-5e2e7e0fd2a8?w=400' },
  { id: 'GINGER', name: 'Ginger', imageUrl: 'https://images.unsplash.com/photo-1615485290382-5e2e7e0fd2a9?w=400' },
  { id: 'GARLIC', name: 'Garlic', imageUrl: 'https://images.unsplash.com/photo-1599909533099-6e2e7e0fd2aa?w=400' },
  { id: 'TAMARIND', name: 'Tamarind', imageUrl: 'https://images.unsplash.com/photo-1599909532873-7e2e7e0fd2ab?w=400' },
  { id: 'POPPY_SEEDS', name: 'Poppy Seeds', imageUrl: 'https://images.unsplash.com/photo-1599909533190-8e2e7e0fd2ac?w=400' },
  { id: 'SESAME', name: 'Sesame Seeds', imageUrl: 'https://images.unsplash.com/photo-1599909532795-9e2e7e0fd2ad?w=400' },
  { id: 'NIGELLA', name: 'Nigella Seeds', imageUrl: 'https://images.unsplash.com/photo-1599909533147-ae2e7e0fd2ae?w=400' },
  { id: 'PAPRIKA', name: 'Paprika', imageUrl: 'https://images.unsplash.com/photo-1599909533601-be2e7e0fd2af?w=400' },
  { id: 'OREGANO', name: 'Oregano', imageUrl: 'https://images.unsplash.com/photo-1599909533099-ce2e7e0fd2b0?w=400' },
  { id: 'THYME', name: 'Thyme', imageUrl: 'https://images.unsplash.com/photo-1599909532873-de2e7e0fd2b1?w=400' },
  { id: 'ROSEMARY', name: 'Rosemary', imageUrl: 'https://images.unsplash.com/photo-1599909533190-ee2e7e0fd2b2?w=400' },
  { id: 'BASIL', name: 'Basil', imageUrl: 'https://images.unsplash.com/photo-1599909532795-fe2e7e0fd2b3?w=400' },
];

// Total count
export const TOTAL_SPICES = 30;

// XP calculation: 300 max XP for all correct (30 × 10)
export const MAX_XP = 300;
export const XP_PER_CORRECT = 10;

// Pairs per round (how many matches shown at once)
export const PAIRS_PER_ROUND = 4;

// Total rounds
export const TOTAL_ROUNDS = Math.ceil(TOTAL_SPICES / PAIRS_PER_ROUND); // 8 rounds

// Get random selection of spices
export function getRandomSpices(count: number = TOTAL_SPICES): Spice[] {
  const shuffled = [...SPICES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get spices for a specific round
export function getSpicesForRound(allSpices: Spice[], roundIndex: number): Spice[] {
  const start = roundIndex * PAIRS_PER_ROUND;
  const end = Math.min(start + PAIRS_PER_ROUND, allSpices.length);
  return allSpices.slice(start, end);
}

// Calculate XP based on correct answers
export function calculateXP(correctCount: number): number {
  return correctCount * XP_PER_CORRECT;
}
