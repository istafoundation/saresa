const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/india-svg-paths.ts');
let content = fs.readFileSync(filePath, 'utf8');

// regex to extract paths
const dnMatch = content.match(/'IN-DN':\s*'([^']+)'/);
const ddMatch = content.match(/'IN-DD':\s*'([^']+)'/);

if (!dnMatch || !ddMatch) {
    console.error('Could not find IN-DN or IN-DD paths');
    process.exit(1);
}

const dnPath = dnMatch[1];
const ddPath = ddMatch[1];
const mergedPath = dnPath + ' ' + ddPath;

// Remove old entries
// We replace the lines. 
// Note: This regex assumes they are on separate lines as seen in view_file
content = content.replace(/  'IN-DN': '[^']+',\r?\n/, '');
content = content.replace(/  'IN-DD': '[^']+',\r?\n/, '');

// Add new entry. We'll add it where IN-DD was roughly, or just before the closing brace depending on preference.
// Let's add it before IN-DL (Delhi) or just alphabetically implies it might go elsewhere, but order doesn't strictly matter for the object.
// We'll append it to the map.
const insertPos = content.lastIndexOf('};');
const newEntry = `  'IN-DH': '${mergedPath}',\n`;

content = content.slice(0, insertPos) + newEntry + content.slice(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully merged IN-DN and IN-DD into IN-DH');
