// Centroids for proximity hit testing
// For disjoint regions (like Daman & Diu), we define multiple points
// Updated with more accurate coordinates for problematic small regions

export const REGION_CENTROIDS: Record<string, {x: number, y: number} | {x: number, y: number}[]> = {
  'IN-JK': { x: 181.82, y: 89.26 },
  'IN-WB': { x: 520, y: 350 },  // Moved to main land area, away from delta islands
  'IN-UT': { x: 295, y: 180 },
  'IN-UP': { x: 332.96, y: 257.77 },
  'IN-TR': { x: 620, y: 348 },
  'IN-TN': { x: 255, y: 700 },
  'IN-TG': { x: 300, y: 507 },
  'IN-SK': { x: 530, y: 248 },
  'IN-RJ': { x: 150, y: 280 },
  // Puducherry (Multiple Enclaves) - more points for better detection
  'IN-PY': [
    { x: 302, y: 658 }, // Puducherry main
    { x: 300, y: 656 }, // Puducherry alternate
    { x: 303, y: 684 }, // Karaikal
    { x: 367, y: 532 }, // Yanam
  ],
  'IN-PB': { x: 190, y: 155 },
  'IN-OR': { x: 420, y: 440 },
  'IN-NL': { x: 682, y: 285 },
  'IN-MZ': { x: 645, y: 365 },
  'IN-MP': { x: 290, y: 365 },
  'IN-MN': { x: 670, y: 322 },
  'IN-ML': { x: 605, y: 300 },
  'IN-MH': { x: 220, y: 460 },
  'IN-LD': [
    { x: 115, y: 680 },
    { x: 120, y: 700 },
    { x: 125, y: 720 },
  ],
  'IN-KL': { x: 210, y: 695 },
  'IN-KA': { x: 210, y: 580 },
  'IN-LA': { x: 230, y: 60 },
  'IN-JH': { x: 445, y: 360 },
  'IN-HR': { x: 210, y: 200 },
  'IN-HP': { x: 240, y: 140 },
  'IN-GJ': { x: 100, y: 380 },
  // Goa - precise centroid for the small coastal state
  'IN-GA': { x: 152, y: 568 },
  // Delhi - precise centroid, centered in actual path
  'IN-DL': { x: 233, y: 218 },
  'IN-CT': { x: 370, y: 420 },
  // Chandigarh - very small, precise location needed
  'IN-CH': { x: 224.5, y: 165.5 },
  'IN-BR': { x: 465, y: 290 },
  'IN-AS': { x: 600, y: 300 },
  'IN-AR': { x: 690, y: 250 },
  'IN-AP': { x: 290, y: 575 },
  'IN-AN': [
    { x: 495, y: 430 },
    { x: 490, y: 470 },
    { x: 485, y: 500 },
  ],
  // Dadra & Nagar Haveli and Daman & Diu (Disjoint) - multiple touch points
  'IN-DH': [
    { x: 131, y: 442 }, // Dadra & Nagar Haveli main area
    { x: 125, y: 441 }, // DNH alternate
    { x: 119, y: 442 }, // Near Daman
    { x: 122, y: 440 }, // Center zone
  ],
};

