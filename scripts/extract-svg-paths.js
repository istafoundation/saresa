const fs = require('fs');

// Read the SVG file
const svg = fs.readFileSync('assets/india.svg', 'utf8');

// Extract all path IDs and their d attributes
const pathRegex = /<path[^>]*id="(IN-[A-Z]{2})"[^>]*d="([^"]+)"/g;
const paths = {};

let match;
while ((match = pathRegex.exec(svg)) !== null) {
  paths[match[1]] = match[2];
}

console.log('Found', Object.keys(paths).length, 'paths');

// Generate TypeScript file
const tsContent = `// India SVG Path Data - Auto-extracted from assets/india.svg
// Each region has an id (e.g., "IN-MH") and its SVG path "d" attribute

export const INDIA_SVG_PATHS: Record<string, string> = {
${Object.entries(paths).map(([id, d]) => `  '${id}': '${d}',`).join('\n')}
};

// ViewBox dimensions from the original SVG
export const INDIA_SVG_VIEWBOX = {
  width: 612,
  height: 696,
};
`;

fs.writeFileSync('data/india-svg-paths.ts', tsContent);
console.log('Written to data/india-svg-paths.ts');
