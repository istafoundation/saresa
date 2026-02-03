const fs = require('fs');
const path = require('path');

// Read the paths file
const pathsFilePath = path.join(__dirname, '../data/india-svg-paths.ts');
const fileContent = fs.readFileSync(pathsFilePath, 'utf8');

// Hacky regex extraction because it's a TS file
const pathRegex = /'([A-Z]{2}-[A-Z]{2})':\s*'([^']+)'/g;
let match;
const paths = {};

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

while ((match = pathRegex.exec(fileContent)) !== null) {
    const id = match[1];
    const pathData = match[2];
    paths[id] = pathData;

    // Very basic coordinate extraction
    const coords = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (coords) {
        for (let i = 0; i < coords.length; i += 2) {
            const x = parseFloat(coords[i]);
            const y = parseFloat(coords[i+1]);
            
            if (!isNaN(x) && !isNaN(y)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
}

console.log(`Bounding Box:`);
console.log(`MinX: ${minX}, MinY: ${minY}`);
console.log(`MaxX: ${maxX}, MaxY: ${maxY}`);
console.log(`Width: ${maxX - minX}, Height: ${maxY - minY}`);

const mergedPath = dnPath + ' ' + ddPath;
fs.writeFileSync(path.join(__dirname, 'temp_merged_path.txt'), mergedPath);
console.log(`Merged path written to temp_merged_path.txt`);
