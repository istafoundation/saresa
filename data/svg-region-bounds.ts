/**
 * Pre-calculated bounding boxes for India regions.
 * Enables fast rejection of regions that are obviously far from tap point.
 * Format: { minX, minY, maxX, maxY, area } in SVG coordinate space
 */

export interface RegionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number; // Approximate area for "smallest wins" logic
}

// Calculated from SVG path data
// Small regions marked with smaller area for priority sorting
export const REGION_BOUNDS: Record<string, RegionBounds> = {
  // Very small regions (highest priority for hit testing)
  'IN-CH': { minX: 222, minY: 163, maxX: 226, maxY: 167, area: 16 },         // Chandigarh
  'IN-DL': { minX: 226, minY: 213, maxX: 240, maxY: 226, area: 182 },         // Delhi - FIXED bounds
  'IN-GA': { minX: 143, minY: 557, maxX: 161, maxY: 579, area: 396 },        // Goa
  'IN-SK': { minX: 518, minY: 233, maxX: 542, maxY: 260, area: 648 },        // Sikkim
  'IN-TR': { minX: 600, minY: 327, maxX: 632, maxY: 368, area: 1312 },       // Tripura
  
  // Disjoint/scattered regions  
  'IN-DH': { minX: 60, minY: 420, maxX: 145, maxY: 445, area: 500 },         // Dadra & Nagar Haveli + Daman & Diu
  'IN-PY': { minX: 236, minY: 530, maxX: 370, maxY: 700, area: 600 },        // Puducherry (scattered enclaves)
  'IN-LD': { minX: 100, minY: 660, maxX: 145, maxY: 755, area: 800 },        // Lakshadweep
  'IN-AN': { minX: 480, minY: 380, maxX: 550, maxY: 510, area: 900 },        // Andaman & Nicobar
  
  // Medium regions
  'IN-MN': { minX: 648, minY: 306, maxX: 695, maxY: 345, area: 1833 },       // Manipur
  'IN-NL': { minX: 660, minY: 261, maxX: 707, maxY: 303, area: 1974 },       // Nagaland
  'IN-MZ': { minX: 630, minY: 330, maxX: 660, maxY: 394, area: 1920 },       // Mizoram
  'IN-ML': { minX: 565, minY: 285, maxX: 645, maxY: 315, area: 2400 },       // Meghalaya
  'IN-HR': { minX: 188, minY: 160, maxX: 245, maxY: 242, area: 4674 },       // Haryana
  'IN-UT': { minX: 245, minY: 145, maxX: 336, maxY: 215, area: 6370 },       // Uttarakhand
  'IN-HP': { minX: 186, minY: 97, maxX: 268, maxY: 160, area: 5166 },        // Himachal Pradesh
  'IN-PB': { minX: 149, minY: 117, maxX: 228, maxY: 196, area: 6241 },       // Punjab
  
  // Large states (lower priority)
  'IN-JK': { minX: 136, minY: 50, maxX: 224, maxY: 125, area: 6600 },        // Jammu & Kashmir
  'IN-LA': { minX: 155, minY: 0, maxX: 316, maxY: 125, area: 20125 },        // Ladakh
  'IN-RJ': { minX: 35, minY: 179, maxX: 270, maxY: 366, area: 43935 },       // Rajasthan
  'IN-GJ': { minX: 0, minY: 305, maxX: 160, maxY: 445, area: 22400 },        // Gujarat
  'IN-MP': { minX: 155, minY: 267, maxX: 395, maxY: 410, area: 34320 },      // Madhya Pradesh
  'IN-UP': { minX: 235, minY: 173, maxX: 420, maxY: 340, area: 30895 },      // Uttar Pradesh
  'IN-BR': { minX: 416, minY: 249, maxX: 526, maxY: 332, area: 9130 },       // Bihar
  'IN-JH': { minX: 400, minY: 326, maxX: 490, maxY: 395, area: 6210 },       // Jharkhand
  'IN-WB': { minX: 475, minY: 257, maxX: 550, maxY: 405, area: 11100 },      // West Bengal
  'IN-OR': { minX: 355, minY: 378, maxX: 510, maxY: 495, area: 18135 },      // Odisha
  'IN-CT': { minX: 320, minY: 338, maxX: 395, maxY: 505, area: 12525 },      // Chhattisgarh
  'IN-MH': { minX: 115, minY: 390, maxX: 335, maxY: 540, area: 33000 },      // Maharashtra
  'IN-TG': { minX: 243, minY: 449, maxX: 356, maxY: 555, area: 11978 },      // Telangana
  'IN-AP': { minX: 259, minY: 468, maxX: 370, maxY: 655, area: 20757 },      // Andhra Pradesh
  'IN-KA': { minX: 150, minY: 520, maxX: 275, maxY: 665, area: 18125 },      // Karnataka
  'IN-KL': { minX: 170, minY: 635, maxX: 235, maxY: 755, area: 7800 },       // Kerala
  'IN-TN': { minX: 200, minY: 620, maxX: 310, maxY: 765, area: 15950 },      // Tamil Nadu
  'IN-AS': { minX: 550, minY: 270, maxX: 660, maxY: 335, area: 7150 },       // Assam
  'IN-AR': { minX: 660, minY: 220, maxX: 720, maxY: 270, area: 3000 },       // Arunachal Pradesh
};

// Get regions sorted by area (smallest first) for hit testing priority
export function getRegionsSortedByArea(): string[] {
  return Object.entries(REGION_BOUNDS)
    .sort(([, a], [, b]) => a.area - b.area)
    .map(([id]) => id);
}

// Check if point is within bounds (with optional padding)
export function isPointInBounds(
  x: number, 
  y: number, 
  bounds: RegionBounds, 
  padding: number = 0
): boolean {
  return (
    x >= bounds.minX - padding &&
    x <= bounds.maxX + padding &&
    y >= bounds.minY - padding &&
    y <= bounds.maxY + padding
  );
}
