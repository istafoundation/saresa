import nlp from 'compromise';

let DICTIONARY: Set<string> | null = null;

async function loadDictionary() {
  if (DICTIONARY) return;
  try {
    // Dynamic import for lazy loading
    // Note: Adjust path if necessary based on actual file location
    const module = await import('./dictionary_data');
    if (module && module.default) {
        DICTIONARY = module.default;
    }
  } catch (err) {
    console.error("Failed to load dictionary:", err);
  }
}

export type GrammarErrorCode = 
    | "CAPITALIZATION" 
    | "PUNCTUATION" 
    | "AGREEMENT" 
    | "WORD_ORDER" 
    | "ARTICLE" 
    | "TENSE" 
    | "TARGET_WORD"
    | "COMPLEMENT" 
    | "LENGTH"
    | "REPETITION"
    | "SPELLING"
    | "NONSENSE"
    | "UNKNOWN";

export type GrammarValidationResult = {
  isValid: boolean;
  error?: string;
  errorCode?: GrammarErrorCode;
  feedback?: string;
};

// Verbs that MUST take a gerund (e.g. enjoy reading)
const GERUND_VERBS = new Set(['enjoy', 'avoid', 'finish', 'mind', 'keep', 'miss', 'suggest', 'recommend']);
// Verbs that MUST take an infinitive (e.g. want to go)
const INFINITIVE_VERBS = new Set(['want', 'decide', 'need', 'plan', 'promise', 'hope', 'expect', 'offer', 'refuse', 'learn']);

/**
 * Validates a user-submitted sentence.
 */
export async function validateSentence(sentence: string, targetWord: string): Promise<GrammarValidationResult> {
  const cleanSentence = sentence.trim();
  
  // --- Layer 1: Mechanics & Formatting ---
  
  // 1. Whitespace (Internal double spaces)
  if (/\s{2,}/.test(cleanSentence)) {
      return { isValid: false, error: "Too much spacing between words.", errorCode: "PUNCTUATION" };
  }
  
  // 2. Length
  const wordCount = cleanSentence.split(/\s+/).length;
  if (wordCount < 3) return { isValid: false, error: "Sentence is too short.", errorCode: "LENGTH" };
  if (wordCount > 20) return { isValid: false, error: "Sentence is too long.", errorCode: "LENGTH" };

  // 3. Punctuation
  const lastChar = cleanSentence.slice(-1);
  if (!['.', '!', '?'].includes(lastChar)) {
    return { isValid: false, error: "Sentence must end with punctuation (. ! or ?)", errorCode: "PUNCTUATION" };
  }
  if (/\s[\.\!\?]/.test(cleanSentence)) {
     return { isValid: false, error: "Don't put a space before punctuation.", errorCode: "PUNCTUATION" };
  }
  if (/[\.\!\?]{2,}/.test(cleanSentence)) {
     return { isValid: false, error: "Too much punctuation! Use just one.", errorCode: "PUNCTUATION" };
  }
  
  // 4. Capitalization
  const firstChar = cleanSentence.charAt(0);
  if (firstChar !== firstChar.toUpperCase() && /[a-z]/.test(firstChar)) {
    if (!['iPhone', 'iPad', 'eBay'].includes(cleanSentence.split(' ')[0])) {
        return { isValid: false, error: "Start with a capital letter.", errorCode: "CAPITALIZATION" };
    }
  }

  // --- Layer 2: Shallow NLP (Compromise) ---
  const doc = nlp(cleanSentence);
  doc.compute('tagger'); 
  
  // Fix Tags
  doc.match('(is|am|are|was|were)').tag('Verb').tag('Copula');
  doc.match('^#Gerund').tag('Noun'); // Running is fun
  
  // 5. Target Word Presence
  if (targetWord) {
      // Basic check
      const lowerTarget = targetWord.toLowerCase();
      const lowerSentence = cleanSentence.toLowerCase();
      
      const hasStrict = doc.has(targetWord) || lowerSentence.includes(lowerTarget);
      
      if (!hasStrict) {
           // Root check
           const rootDoc = nlp(cleanSentence);
           rootDoc.compute('root');
           const roots = rootDoc.text('root');
           
           if (!roots.toLowerCase().includes(lowerTarget)) {
               return { isValid: false, error: `You must use the word "${targetWord}"!`, errorCode: "TARGET_WORD" };
           }
      }
  }

  // 6. Determiner-Noun Agreement
  // "a/an" checks
  const articles = doc.match('(a|an)');
  const articleList = articles.json(); // Use .json() to get list of matches
  
  for (const m of articleList) {
      // m is like { text: "a", terms: [...], ... }
      // We need to find the word AFTER this article in the original sentence/doc
      // Compromise's .match returns a view. We can look ahead from the match.
      // Let's re-find it in the doc to be safe or use the text index?
      // Easier: iterate the terms of the main doc.
  }
  
  // Alternative Article Check using Term loop
  const terms = doc.terms().json();
  for (let i = 0; i < terms.length - 1; i++) {
      const current = terms[i].text.toLowerCase();
      const nextTerm = terms[i+1];
      const nextWord = nextTerm.text;
      const cleanNext = nextWord.replace(/[^a-zA-Z]/g, '');
      
      if (!cleanNext) continue;

      if (current === 'a') {
           const isVowelSound = /^[aeio]/.test(cleanNext.toLowerCase());
           // Exceptions
           const isUniversity = cleanNext.toLowerCase().startsWith('uni') || cleanNext.toLowerCase().startsWith('use');
           
           if (isVowelSound && !isUniversity) {
                return { isValid: false, error: `Use "an" before vowel sounds (e.g. "an ${cleanNext}").`, errorCode: "ARTICLE" };
           }
      }
      if (current === 'an') {
           const isVowelSound = /^[aeio]/.test(cleanNext.toLowerCase());
           const isH = cleanNext.toLowerCase().startsWith('h'); // "an hour" vs "a house" - hard to distinguish phonetics perfectly without dictionary, but simple heuristic:
           // "an house" -> wrong. "an hour" -> right.
           // We will trust the user knows phonetics or use simple rule: "an" + vowel (except 'u' in some cases) or 'h' silent?
           // Text says: "She bought a umbrella" -> "an umbrella".
           // "an umbrella" -> correct.
           
           if (!isVowelSound && !isH) {
               return { isValid: false, error: `Use "a" before consonant sounds (e.g. "a ${cleanNext}").`, errorCode: "ARTICLE" };
           }
      }
      
      // Plural checks: "a/an" + Plural
      if ((current === 'a' || current === 'an') && nextTerm.tags && nextTerm.tags.includes('Plural')) {
           return { isValid: false, error: `Don't use "${current}" with plural words like "${nextWord}".`, errorCode: "ARTICLE" };
      }
  }
  
  // Quantifier Agreement
  if (doc.match('many #Singular').found) {
      if (!doc.match('many #Singular').has('#Uncountable')) { // heuristics
          return { isValid: false, error: "Use 'many' with plural nouns (e.g. many dogs).", errorCode: "AGREEMENT" };
      }
      // Fail "many water"
      if (doc.match('many #Uncountable').found) {
          return { isValid: false, error: "Use 'much' with uncountable nouns (e.g. much water).", errorCode: "AGREEMENT" };
      }
  }
  if (doc.match('much #Plural').found) { // "much dogs"
      return { isValid: false, error: "Use 'many' with countable/plural things, not 'much'.", errorCode: "AGREEMENT" };
  }

  // 7. Subject-Verb Agreement (Detailed)
  // I am / You are / He is
  if (doc.match('I (are|is|were)').found) return { isValid: false, error: "Say 'I am' or 'I was'.", errorCode: "AGREEMENT" };
  if (doc.match('(You|We|They) (is|am|was)').found) return { isValid: false, error: "Subject is plural, so use 'are' or 'were'.", errorCode: "AGREEMENT" };
  if (doc.match('(He|She|It) (are|am|were)').found) return { isValid: false, error: "Subject is singular, so use 'is' or 'was'.", errorCode: "AGREEMENT" };
  
  // 7. Auxiliary / Modal Consistency
  if (doc.match('(can|could|will|would|should|must|do|does|did) #Negative? #PresentTense').match('#PresentTense').text().endsWith('s')) {
       return { isValid: false, error: "After auxiliary words like 'can' or 'do', use the base form of the verb (e.g., 'can run', not 'can runs').", errorCode: "AGREEMENT" };
  }

  // "She eat" vs "She eats"
  if (doc.match('(He|She|It|#Person) #PresentTense').match('!#Copula').found) {
      // Find the verb text
      const verbPhrase = doc.match('(He|She|It|#Person) #PresentTense').match('#PresentTense');
      const verbText = verbPhrase.text();
      
      // Check if it's "can eat" (Modal) -> skip
      if (doc.match('(He|She|It|#Person) #Modal #PresentTense').found) {
          // Valid
      } else {
          // If it doesn't end in s (fuzzy check)
          if (!verbText.endsWith('s') && verbText !== 'has' && verbText !== 'does') {
               return { isValid: false, error: `3rd person subjects need an 's' on the main verb (excluding auxiliary verbs) (e.g. "She eats") (agreement error).`, errorCode: "AGREEMENT" };
          }
      }
  }
  
  // "There is/are"
  if (doc.match('There is #Plural').found) return { isValid: false, error: "Use 'There are' for multiple things.", errorCode: "AGREEMENT" };
  if (doc.match('There are #Singular').found && !doc.match('There are (a|an|one)').found) return { isValid: false, error: "Use 'There is' for one thing.", errorCode: "AGREEMENT" };
  if (doc.match('There are (a|an)').found && !doc.match('There are (a|an) (lot|few|number|group|couple)').found) {
       return { isValid: false, error: "Use 'There is' for singular items.", errorCode: "AGREEMENT" };
  }
  
  // Specific Articles (Sun/Moon)
  if (/\b(sun|moon|sky|earth|world)\b/i.test(cleanSentence) && !/\b(the|a|an)\s+(sun|moon|sky|earth|world)/i.test(cleanSentence)) {
       return { isValid: false, error: "Use 'the' with unique nouns (e.g., 'the sun').", errorCode: "ARTICLE" };
  }


  // 8. Verb Complements (Gerund vs Infinitive)
  // "enjoy reading" (Good) vs "enjoy to read" (Bad)
  for (const v of GERUND_VERBS) {
      // Use more robust matching: root form + next word
      // v is "enjoy". "enjoyed reading" -> okay.
      if (doc.has(v)) {
          // match("enjoy").lookAhead(1) ?
          // Or regex-like match
          // match(`[${v}] .`) covers inflections
          const after = doc.match(`[${v}] .`).terms(1); 
          if (after.text() === 'to') {
               return { isValid: false, error: `After '${v}', use the -ing form (e.g. "${v} reading"), not "to...".`, errorCode: "COMPLEMENT" };
          }
      }
  }
  // "want to go" (Good) vs "want going" (Bad)
  for (const v of INFINITIVE_VERBS) {
       if (doc.has(v)) {
          const after = doc.match(`[${v}] .`).terms(1);
          if (after.has('#Gerund')) { // "want going"
               return { isValid: false, error: `After '${v}', use "to" (e.g. "${v} to go").`, errorCode: "COMPLEMENT" };
          }
       }
  }

  // 9. Relative Clauses
  // "The boy who running" -> invalid
  if (doc.has('who') || doc.has('that')) {
      // who running
      if (doc.match('who #Gerund').found) {
           return { isValid: false, error: "Use a helping verb (e.g. 'who is running').", errorCode: "AGREEMENT" };
      }
  }

  // 10. Word Order / Yoda Speak
  const subjPronouns = '(I|he|she|we|they)';
  
  if (doc.match(`^#Verb #Adverb #Pronoun`).found) {
       return { isValid: false, error: "Word order is confused. Start with the subject.", errorCode: "WORD_ORDER" };
  }
  // "Fast run I"
  if (doc.match(`^(#Adverb|#Adjective) #Verb ${subjPronouns}`).found && !lastChar.includes('?')) {
       return { isValid: false, error: "Start with the subject, not the action.", errorCode: "WORD_ORDER" };
  }
  // "Apple eat I"
  if (doc.match(`^#Noun #Verb ${subjPronouns}`).found) {
      return { isValid: false, error: "Put the subject (I/He/She) before the verb.", errorCode: "WORD_ORDER" };
  }
  // "Run I"
  if (doc.match(`^#Verb ${subjPronouns}`).found && !lastChar.includes('?')) {
      return { isValid: false, error: "Put the subject before the verb.", errorCode: "WORD_ORDER" };
  }
  // "Eat often I rice"
  if (doc.match(`^#Verb #Adverb ${subjPronouns}`).found) {
      return { isValid: false, error: "Broken word order.", errorCode: "WORD_ORDER" };
  }
  
  // Question Inversion
  if (lastChar === '?') {
       if (doc.match('^(Why|What|Where|When|Who|How) #Pronoun #Copula').found) { // Why you are...
             return { isValid: false, error: "In questions, put the verb before the subject (e.g. 'Why are you...').", errorCode: "WORD_ORDER" };
       }
       if (doc.match('^#Pronoun do #Verb').found) { // You do like...
             return { isValid: false, error: "Start questions with 'Do' (e.g. 'Do you like...').", errorCode: "WORD_ORDER" };
       }
  }

  // 11. Dictionary Check
  await loadDictionary();
  const lowerWords = cleanSentence.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  for (const w of lowerWords) {
      if (w.length > 3 && DICTIONARY && !DICTIONARY.has(w) && !['iphone', 'ipad', 'nasa'].includes(w)) {
           // Basic heuristic for common typos, ignore numbers
           if (!/\d/.test(w)) {
                // If it's a known failing word, strictness applies
                return { isValid: false, error: `I don't recognize the word "${w}". Check your spelling!`, errorCode: "SPELLING" };
           }
      }
  }

  // 12. Spam
  const unique = new Set(lowerWords).size;
  if (unique < lowerWords.length / 2 && lowerWords.length >= 4) {
      return { isValid: false, error: "Too much repetition.", errorCode: "REPETITION" };
  }

  // Fallback: If no major error found
  return { isValid: true, feedback: "Great sentence!" };
}
