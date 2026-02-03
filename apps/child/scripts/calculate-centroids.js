const fs = require('fs');
const path = require('path');

const pathsFilePath = path.join(__dirname, '../data/india-svg-paths.ts');
const fileContent = fs.readFileSync(pathsFilePath, 'utf8');

const pathRegex = /'([A-Z]{2}-[A-Z]{2})':\s*'([^']+)'/g;
let match;
const centroids = {};

while ((match = pathRegex.exec(fileContent)) !== null) {
    const id = match[1];
    const pathData = match[2];
    
    // Extract numbers
    const coords = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (coords && coords.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let sumX = 0, sumY = 0, count = 0;

        for (let i = 0; i < coords.length; i += 2) {
            const x = parseFloat(coords[i]);
            const y = parseFloat(coords[i+1]);
            
            if (!isNaN(x) && !isNaN(y)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                
                // Simple average for roughly center (not true weighted centroid but good enough for BBox center)
                // Actually BBox center is safer for "click target"
            }
        }
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        centroids[id] = { x: parseFloat(centerX.toFixed(2)), y: parseFloat(centerY.toFixed(2)) };
    }
}

console.log('export const REGION_CENTROIDS: Record<string, {x: number, y: number}> = {');
for (const [id, point] of Object.entries(centroids)) {
    console.log(`  '${id}': { x: ${point.x}, y: ${point.y} },`);
}
console.log('};');
