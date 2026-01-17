// India States and Union Territories for Explorer's Heaven
// Data extracted from assets/india.svg

export interface IndiaRegion {
  id: string;        // SVG path ID (e.g., "IN-MH")
  name: string;      // Display name (e.g., "Maharashtra")
  type: 'state' | 'ut';
}

export const INDIA_REGIONS: IndiaRegion[] = [
  // States (28)
  { id: 'IN-AP', name: 'Andhra Pradesh', type: 'state' },
  { id: 'IN-AR', name: 'Arunachal Pradesh', type: 'state' },
  { id: 'IN-AS', name: 'Assam', type: 'state' },
  { id: 'IN-BR', name: 'Bihar', type: 'state' },
  { id: 'IN-CT', name: 'Chhattisgarh', type: 'state' },
  { id: 'IN-GA', name: 'Goa', type: 'state' },
  { id: 'IN-GJ', name: 'Gujarat', type: 'state' },
  { id: 'IN-HR', name: 'Haryana', type: 'state' },
  { id: 'IN-HP', name: 'Himachal Pradesh', type: 'state' },
  { id: 'IN-JH', name: 'Jharkhand', type: 'state' },
  { id: 'IN-KA', name: 'Karnataka', type: 'state' },
  { id: 'IN-KL', name: 'Kerala', type: 'state' },
  { id: 'IN-MP', name: 'Madhya Pradesh', type: 'state' },
  { id: 'IN-MH', name: 'Maharashtra', type: 'state' },
  { id: 'IN-MN', name: 'Manipur', type: 'state' },
  { id: 'IN-ML', name: 'Meghalaya', type: 'state' },
  { id: 'IN-MZ', name: 'Mizoram', type: 'state' },
  { id: 'IN-NL', name: 'Nagaland', type: 'state' },
  { id: 'IN-OR', name: 'Odisha', type: 'state' },
  { id: 'IN-PB', name: 'Punjab', type: 'state' },
  { id: 'IN-RJ', name: 'Rajasthan', type: 'state' },
  { id: 'IN-SK', name: 'Sikkim', type: 'state' },
  { id: 'IN-TN', name: 'Tamil Nadu', type: 'state' },
  { id: 'IN-TG', name: 'Telangana', type: 'state' },
  { id: 'IN-TR', name: 'Tripura', type: 'state' },
  { id: 'IN-UP', name: 'Uttar Pradesh', type: 'state' },
  { id: 'IN-UT', name: 'Uttarakhand', type: 'state' },
  { id: 'IN-WB', name: 'West Bengal', type: 'state' },
  
  // Union Territories (7)
  { id: 'IN-AN', name: 'Andaman and Nicobar Islands', type: 'ut' },
  { id: 'IN-CH', name: 'Chandigarh', type: 'ut' },
  { id: 'IN-DH', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'ut' },
  { id: 'IN-DL', name: 'Delhi', type: 'ut' },
  { id: 'IN-JK', name: 'Jammu and Kashmir', type: 'ut' },
  { id: 'IN-LA', name: 'Ladakh', type: 'ut' },
  { id: 'IN-LD', name: 'Lakshadweep', type: 'ut' },
  { id: 'IN-PY', name: 'Puducherry', type: 'ut' },
];

// Total count
export const TOTAL_REGIONS = 36;

// XP calculation: 360 max XP for all correct (36 × 10)
export const MAX_XP = 360; // 36 regions × 10 XP each
export const XP_PER_CORRECT = 10; // Fixed 10 XP per correct answer

// Get region by ID
export function getRegionById(id: string): IndiaRegion | undefined {
  return INDIA_REGIONS.find(region => region.id === id);
}

// Validate that all regions have SVG paths (call this at startup in dev mode)
export function validateRegionsWithPaths(svgPaths: Record<string, string>): string[] {
  const missingPaths: string[] = [];
  for (const region of INDIA_REGIONS) {
    if (!svgPaths[region.id]) {
      missingPaths.push(`${region.id} (${region.name})`);
    }
  }
  return missingPaths;
}

// Get random unguessed region
export function getRandomUnguessedRegion(guessedIds: string[]): IndiaRegion | null {
  const unguessed = INDIA_REGIONS.filter(region => !guessedIds.includes(region.id));
  if (unguessed.length === 0) return null;
  return unguessed[Math.floor(Math.random() * unguessed.length)];
}

// Calculate XP based on correct answers
export function calculateXP(correctCount: number): number {
  return correctCount * XP_PER_CORRECT;
}
