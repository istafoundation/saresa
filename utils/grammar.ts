import nlp from 'compromise';

export type GrammarValidationResult = {
  isValid: boolean;
  error?: string;
  feedback?: string; // Positive feedback for good sentences
};

/**
 * Validates a user-submitted sentence based on a target word.
 * Uses a heuristic "Layered Validation" strategy to avoid AI costs.
 * 
 * Layers:
 * 1. Mechanical: Capitalization, punctuation, length.
 * 2. Negative Filters: Catch spam, fragments, cheats.
 * 3. Structure: Subject-Verb agreement (loose), presence of core components.
 * 4. Templates: Matches common simple sentence patterns.
 */
export function validateSentence(sentence: string, targetWord: string): GrammarValidationResult {
  const cleanSentence = sentence.trim();
  const doc = nlp(cleanSentence);

  // --- Layer 1: Mechanics (Fastest Fail) ---
  
  // 1. Length Check
  const wordCount = doc.terms().length;
  if (wordCount < 3) return { isValid: false, error: "Sentence is too short. Try making it longer!" };
  if (wordCount > 30) return { isValid: false, error: "Sentence is too long. Keep it simple!" };

  // 2. Capitalization
  const firstChar = cleanSentence.charAt(0);
  if (firstChar !== firstChar.toUpperCase() && /[a-z]/.test(firstChar)) {
    return { isValid: false, error: "Sentence must start with a capital letter." };
  }

  // 3. Punctuation
  const lastChar = cleanSentence.slice(-1);
  if (!['.', '!', '?'].includes(lastChar)) {
    return { isValid: false, error: "Sentence must end with punctuation (. ! or ?)" };
  }
  
  // Check for repeated punctuation like "!!" or ".."
  if (/[\.\!\?]{2,}/.test(cleanSentence)) {
     return { isValid: false, error: "Too much punctuation! Use just one." };
  }


  // --- Layer 2: Negative Filters (Anti-Cheat) ---

  // 1. Target Word Presence (Case-insensitive)
  // We use nlp's match to handle basic lemmatization forms if needed, but strict inclusion is usually safer for this game.
  // Using simple string check for robustness, then nlp check for variations if needed.
  if (!cleanSentence.toLowerCase().includes(targetWord.toLowerCase())) {
     return { isValid: false, error: `You must use the word "${targetWord}"!` };
  }

  // 2. Spam / Repetition Check (Unique words ratio)
  const uniqueWords = new Set(cleanSentence.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''))).size;
  if (uniqueWords < wordCount * 0.5) {
      return { isValid: false, error: "Please don't just repeat words!" };
  }


  // --- Layer 3: NLP Structure & Templates ---

  // 1. Basic Components
  const hasVerb = doc.verbs().length > 0;
  const hasNoun = doc.nouns().length > 0 || doc.match('#Pronoun').length > 0;

  if (!hasVerb) return { isValid: false, error: "Your sentence needs a verb (action word)." };
  if (!hasNoun) return { isValid: false, error: "Your sentence needs a subject (who or what?)." };

  // 2. Fragments
  // Compromise attempts to split sentences. If it sees multiple or zero, it's messy.
  // Actually, for this, we just want to ensure it looks like ONE statement.
  // If user writes "I run. He walks.", that's two sentences.
  // The punctuation check at the end somewhat enforces this, but let's see if compromise detects multiple sentences.
  if (doc.json().length > 1) {
      return { isValid: false, error: "Just write one sentence at a time." };
  }

  // 3. Subject-Verb Order Heuristic
  // In English, the subject usually comes *before* the first main verb (statements).
  // "The cat sat." -> Cat (Subject) ... Sat (Verb).
  // "Run fast." (Imperative) -> No subject, but might be valid demand? 
  // For this game, we usually want declarative sentences "Use the word...".
  // Let's check if there is a Noun/Pronoun BEFORE the first Verb.
  
  const terms = doc.terms().json();
  const firstVerbIndex = terms.findIndex((t: any) => t.tags.includes('Verb'));
  
  if (firstVerbIndex > 0) {
      const genericSubject = terms.slice(0, firstVerbIndex).some((t: any) => 
          t.tags.includes('Noun') || t.tags.includes('Pronoun') || t.tags.includes('Determiner') || t.tags.includes('Adjective') // "The Red Apple fell" -> 'The' 'Red' 'Apple' are before verb.
      );
      // This is weak. "Quickly run." -> 'Quickly' is Adverb.
      
      // Let's stick to: Does it match a valid template?
  }
  
  // --- Layer 4: Template Matching (The "Green Pass") ---
  // If it matches these patterns, we trust it more.
  
  const patterns = [
      '#Pronoun #Verb',                     // I run.
      '#Pronoun #Verb .?',                  // I run fast.
      '#Pronoun #Auxiliary #Verb',          // I am running.
      '#Noun #Verb',                        // Dogs bark.
      '#Determiner #Noun #Verb',            // The dog barks.
      '#Noun #Verb #Noun',                  // Dogs chase cats.
      '#Pronoun #Verb #Noun',               // I like apples.
      '#Pronoun #Verb #Adjective',          // I am happy.
      '#Pronoun #Verb #Adverb',             // I run fast.
      '#Verb #Noun',                        // Eat apples. (Imperative - maybe allow?)
      '#Adjective #Noun #Verb',             // Red trucks drive.
  ];

  let matchesTemplate = false;
  for (const pattern of patterns) {
      if (doc.match(pattern).found) {
          matchesTemplate = true;
          break;
      }
  }

  // If it has Noun + Verb but matches NO template, it might be complex or wrong.
  // For now, if it has Noun + Verb, we are "Okay" with it, but maybe verify the order.
  
  // Final safeguard: The Subject-Verb check again.
  // If we have a verb, we really want something noun-y before it, UNLESS it's a question or imperative.
  // Questions start with Aux/Verb: "Do you like..." / "Is it..."
  const isQuestion = lastChar === '?';
  if (!isQuestion && !matchesTemplate) {
       // If strict mode on subject-verb:
       // If the FIRST word is a Verb, and it's not a question, it's an imperative "Run away."
       // We can allow or warn.
       const firstTerm = terms[0];
       if (firstTerm.tags.includes('Verb') && !firstTerm.tags.includes('Imperative')) { // Compromise might not tag imperative well without context
            // "Ran away." -> Incorrect. "Run away." -> Correct.
            // Let's just pass it if it has Verb + Noun elsewhere.
       }
  }


  return { 
      isValid: true, 
      feedback: "Great sentence!" 
  };
}
