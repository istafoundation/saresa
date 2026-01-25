
import fs from 'fs';
import path from 'path';
import https from 'https';

const OUTPUT_FILE = path.join(__dirname, '../utils/dictionary_data.ts');
const WORDLE_OUTPUT_FILE = path.join(__dirname, '../assets/possible_wordle_words.json');
const FREQUENCY_LIST_URL = 'https://raw.githubusercontent.com/david47k/top-english-wordlists/master/top_english_words_lower_50000.txt';

/**
 * WORDS TO EXPLICITLY INCLUDE
 */
const WHITELIST = [
    "saresa", "convex", "expo", "tsx", "latte"
];

/**
 * WORDS TO EXPLICITLY EXCLUDE
 */
const BLACKLIST = new Set([
  "luv", "wanna", "gonna", "gotta", "u", "r", "thru", "n", "kinda", "sorta", "betcha"
]);

async function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function build() {
    console.log("Fetching frequency-weighted word list...");
    
    try {
        const content = await downloadFile(FREQUENCY_LIST_URL);
        const lines = content.split('\n');
        console.log(`Downloaded ${lines.length} words from frequency list.`);

        const validWords = new Set<string>();

        // 1. Add Whitelist
        WHITELIST.forEach(w => validWords.add(w.toLowerCase()));

        // 2. Add Top 50,000 from frequency list
        for (const line of lines) {
            const word = line.trim().toLowerCase();
            if (!word || word.length < 1) continue;
            
            // Clean word: only letters
            const clean = word.replace(/[^a-z]/g, '');
            if (clean.length > 0 && !BLACKLIST.has(clean)) {
                validWords.add(clean);
            }
            
            if (validWords.size >= 50000) break;
        }

        console.log(`Final dictionary has ${validWords.size} words.`);

        // 3. Write output
        const wordsArray = Array.from(validWords);
        const fileContent = `// Auto-generated dictionary file
// Source: ${FREQUENCY_LIST_URL}
// Contains ${wordsArray.length} words

const dictionary = new Set([
${wordsArray.map(w => JSON.stringify(w)).join(',')}
]);

export default dictionary;
`;

        fs.writeFileSync(OUTPUT_FILE, fileContent);
        console.log(`Successfully wrote to ${OUTPUT_FILE}`);

        // 4. Write Wordle Words (5-letter words, uppercase)
        const wordleWords = wordsArray
            .filter(w => w.length === 5)
            .map(w => w.toUpperCase());
        
        fs.writeFileSync(WORDLE_OUTPUT_FILE, JSON.stringify(wordleWords));
        console.log(`Successfully wrote ${wordleWords.length} words to ${WORDLE_OUTPUT_FILE}`);

    } catch (error) {
        console.error("Failed to build dictionary:", error);
        process.exit(1);
    }
}

build();

