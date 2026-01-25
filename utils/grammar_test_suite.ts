
import { validateSentence } from './grammar';
import * as fs from 'fs';

type GrammarErrorCode = 
    | "CAPITALIZATION" 
    | "PUNCTUATION" 
    | "AGREEMENT" 
    | "WORD_ORDER" 
    | "ARTICLE" 
    | "TENSE" 
    | "TARGET_WORD"
    | "COMPLEMENT" // For verb + gerund/infinitive errors
    | "LENGTH"
    | "REPETITION"
    | "SPELLING"
    | "NONSENSE"
    | "UNKNOWN";

type TestCase = {
    sentence: string;
    targetWord: string;
    shouldBeValid: boolean;
    description: string;
    expectedErrorSubstring?: string; // Legacy support or specific message check
    expectedErrorCode?: GrammarErrorCode;
};

const testCases: TestCase[] = [
    // ==========================================
    // 1️⃣ Minimal Pair Tests (One-token difference)
    // ==========================================
    { sentence: "She eats rice.", targetWord: "eats", shouldBeValid: true, description: "3rd person singular present" },
    { sentence: "She eat rice.", targetWord: "eat", shouldBeValid: false, description: "Missing 3rd person -s", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "agreement" },

    { sentence: "I am a teacher.", targetWord: "am", shouldBeValid: true, description: "Correct be-verb" },
    { sentence: "I are a teacher.", targetWord: "are", shouldBeValid: false, description: "Wrong be-verb", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "am" },
    { sentence: "I is a teacher.", targetWord: "is", shouldBeValid: false, description: "Wrong be-verb (is)", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "am" },

    { sentence: "There is a problem.", targetWord: "is", shouldBeValid: true, description: "There is singular" },
    { sentence: "There are a problem.", targetWord: "are", shouldBeValid: false, description: "There are + singular", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "There is" },
    // --- Nonsense / Gibberish ---
    { sentence: "Asdf jkl semicolon.", targetWord: "semicolon", shouldBeValid: false, description: "Gibberish words" },
    { sentence: "The gdjskg runs.", targetWord: "runs", shouldBeValid: false, description: "Gibberish noun" },
    { sentence: "I love affle and apple.", targetWord: "apple", shouldBeValid: false, description: "User reported typo 'affle'", expectedErrorCode: "SPELLING" },
    { sentence: "There are problems.", targetWord: "are", shouldBeValid: true, description: "There are plural" },
    { sentence: "There is problems.", targetWord: "is", shouldBeValid: false, description: "There is + plural", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "There are" },


    // ==========================================
    // 2️⃣ Determiner–Noun Compatibility Matrix
    // ==========================================
    { sentence: "I saw a dog.", targetWord: "dog", shouldBeValid: true, description: "a + singular count noun" },
    { sentence: "I saw a dogs.", targetWord: "dogs", shouldBeValid: false, description: "a + plural noun", expectedErrorCode: "ARTICLE", expectedErrorSubstring: "article" },
    
    { sentence: "I saw an apple.", targetWord: "apple", shouldBeValid: true, description: "an + vowel sound" },
    { sentence: "I saw a apple.", targetWord: "apple", shouldBeValid: false, description: "a + vowel sound", expectedErrorCode: "ARTICLE", expectedErrorSubstring: "an apple" },

    { sentence: "I saw many dogs.", targetWord: "dogs", shouldBeValid: true, description: "many + plural" },
    { sentence: "I saw many dog.", targetWord: "dog", shouldBeValid: false, description: "many + singular", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "many" },

    { sentence: "I drank much water.", targetWord: "water", shouldBeValid: true, description: "much + uncountable" },
    { sentence: "I drank many water.", targetWord: "water", shouldBeValid: false, description: "many + uncountable", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "many" },


    // ==========================================
    // 3️⃣ Verb Complement Structure (Gerunds/Infinitives)
    // ==========================================
    { sentence: "I enjoy reading books.", targetWord: "reading", shouldBeValid: true, description: "Verb + gerund (enjoy)" },
    { sentence: "I enjoy to read books.", targetWord: "read", shouldBeValid: false, description: "Wrong complement for enjoy", expectedErrorCode: "COMPLEMENT", expectedErrorSubstring: "enjoy" },

    { sentence: "I decided to leave.", targetWord: "leave", shouldBeValid: true, description: "Verb + infinitive (decide)" },
    { sentence: "I decided leaving.", targetWord: "leaving", shouldBeValid: false, description: "Wrong complement for decide", expectedErrorCode: "COMPLEMENT", expectedErrorSubstring: "decide" },
    
    { sentence: "I want to go.", targetWord: "want", shouldBeValid: true, description: "Verb + infinitive (want)" },
    { sentence: "I want going.", targetWord: "want", shouldBeValid: false, description: "Wrong complement for want", expectedErrorCode: "COMPLEMENT", expectedErrorSubstring: "want" },


    // ==========================================
    // 4️⃣ Relative Clauses
    // ==========================================
    { sentence: "The boy who is running is fast.", targetWord: "running", shouldBeValid: true, description: "Subject relative clause" },
    { sentence: "The boy who running is fast.", targetWord: "running", shouldBeValid: false, description: "Missing auxiliary in relative clause", expectedErrorCode: "AGREEMENT", expectedErrorSubstring: "who is" },
    
    { sentence: "This is the book that I read.", targetWord: "read", shouldBeValid: true, description: "Object relative clause" },


    // ==========================================
    // 5️⃣ Word Order Stress Tests
    // ==========================================
    { sentence: "Only she likes apples.", targetWord: "likes", shouldBeValid: true, description: "Focus adverb fronting" },
    { sentence: "She likes only apples.", targetWord: "likes", shouldBeValid: true, description: "Adverb placement variation" },

    { sentence: "Often I eat rice.", targetWord: "eat", shouldBeValid: true, description: "Adverbial fronting" },
    { sentence: "Eat often I rice.", targetWord: "eat", shouldBeValid: false, description: "Broken word order", expectedErrorCode: "WORD_ORDER", expectedErrorSubstring: "order" },
    
    { sentence: "I quickly ran home.", targetWord: "ran", shouldBeValid: true, description: "Adverb before verb" },
    { sentence: "I ran quickly home.", targetWord: "ran", shouldBeValid: true, description: "Adverb after verb" },


    // ==========================================
    // 6️⃣ Homographs & POS Ambiguity
    // ==========================================
    { sentence: "I can can the food.", targetWord: "can", shouldBeValid: true, description: "Modal + lexical verb homograph" },
    { sentence: "They fish in the river.", targetWord: "fish", shouldBeValid: true, description: "Verb usage" },
    { sentence: "They eat fish.", targetWord: "fish", shouldBeValid: true, description: "Noun usage" },


    // ==========================================
    // 7️⃣ Sentence Boundary & Whitespace Abuse
    // ==========================================
    { sentence: " I run fast. ", targetWord: "run", shouldBeValid: true, description: "Leading/trailing whitespace (should be trimmed)" },
    { sentence: "I  run fast.", targetWord: "run", shouldBeValid: false, description: "Multiple internal spaces", expectedErrorCode: "PUNCTUATION", expectedErrorSubstring: "spacing" },
    { sentence: "I run fast .", targetWord: "run", shouldBeValid: false, description: "Space before punctuation", expectedErrorCode: "PUNCTUATION", expectedErrorSubstring: "punctuation" },


    // ==========================================
    // 8️⃣ Semantic-but-Grammatically-Valid (Must PASS)
    // ==========================================
    { sentence: "Colorless green ideas sleep furiously.", targetWord: "ideas", shouldBeValid: true, description: "Chomsky sentence" },
    { sentence: "My toaster believes in justice.", targetWord: "believes", shouldBeValid: true, description: "Semantic nonsense but grammatical" },


    // ==========================================
    // 9️⃣ Existing/Preserved Checks
    // ==========================================
    { sentence: "i run fast.", targetWord: "run", shouldBeValid: false, description: "Lowercase start", expectedErrorCode: "CAPITALIZATION" },
    { sentence: "I run fast", targetWord: "run", shouldBeValid: false, description: "Missing punctuation", expectedErrorCode: "PUNCTUATION" },
    { sentence: "I run fast!!", targetWord: "run", shouldBeValid: false, description: "Double punctuation", expectedErrorCode: "PUNCTUATION" },
    { sentence: "Go.", targetWord: "go", shouldBeValid: false, description: "Too short", expectedErrorCode: "LENGTH" },
    { sentence: "I swim fast.", targetWord: "run", shouldBeValid: false, description: "Missing target word", expectedErrorCode: "TARGET_WORD" },
    { sentence: "Run run run run.", targetWord: "run", shouldBeValid: false, description: "Repetition spam", expectedErrorCode: "REPETITION" },
    
    // YODA Speak / Structural Failures
    { sentence: "Fast run I.", targetWord: "run", shouldBeValid: false, description: "Adverb Verb Subject", expectedErrorCode: "WORD_ORDER" },
    { sentence: "Apple eat I.", targetWord: "eat", shouldBeValid: false, description: "Object Verb Subject", expectedErrorCode: "WORD_ORDER" },

    // Articles
    { sentence: "Sun rises in the east.", targetWord: "Sun", shouldBeValid: false, description: "Missing article with unique noun", expectedErrorCode: "ARTICLE" },
    { sentence: "The sun rises in the east.", targetWord: "sun", shouldBeValid: true, description: "Definite article with unique noun" },

    // Questions
    { sentence: "Why you are late?", targetWord: "late", shouldBeValid: false, description: "Wh-question missing inversion", expectedErrorCode: "WORD_ORDER" },
    { sentence: "Why are you late?", targetWord: "late", shouldBeValid: true, description: "Correct wh-question" },
];

async function runTests() {
    let passed = 0;
    let failed = 0;
    const failures: any[] = [];

    console.log(`Running Grammar Test Suite (${testCases.length} tests)...\n`);

    for (let index = 0; index < testCases.length; index++) {
        const test = testCases[index];
        try {
            const result = await validateSentence(test.sentence, test.targetWord);
            const success = result.isValid === test.shouldBeValid;

            let errorMatch = true;
            let codeMatch = true;

            if (!test.shouldBeValid) {
                 // 1. Check Error Substring (if provided)
                 if (test.expectedErrorSubstring && result.error) {
                    if (!result.error.toLowerCase().includes(test.expectedErrorSubstring.toLowerCase())) {
                        errorMatch = false;
                    }
                 }
            }

            if (success && errorMatch) {
                passed++;
            } else {
                failed++;
                failures.push({
                    index: index + 1,
                    description: test.description,
                    sentence: test.sentence,
                    expectedValid: test.shouldBeValid,
                    gotValid: result.isValid,
                    gotError: result.error,
                    expectedError: test.expectedErrorSubstring
                });
                console.log(`❌ Test ${index + 1}: ${test.description}`);
                console.log(`   Sentence: "${test.sentence}"`);
                console.log(`   Expected Valid: ${test.shouldBeValid}, Got: ${result.isValid}`);
                if (result.error) console.log(`   Error: "${result.error}"`);
                console.log('---');
            }
        } catch (err) {
            console.error(`💥 CRASH in Test ${index + 1}: ${test.description}`);
            console.error(err);
            failed++;
        }
    }

    if (failed > 0) {
        fs.writeFileSync('test_report.txt', JSON.stringify(failures, null, 2));
    } else {
        fs.writeFileSync('test_report.txt', "All tests passed!");
    }

    console.log(`\nTests Completed.`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${testCases.length}`);
}

runTests().catch(console.error);
