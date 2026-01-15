// Word Finder game data - Word sets for Easy mode and Questions for Hard mode
// English vocabulary focused

export interface WordSet {
  id: number;
  theme: string;
  words: string[];
}

export interface HardQuestion {
  id: number;
  question: string;
  answer: string;
  hint: string;
}

// Easy mode: 5-word themed sets (English vocabulary focused)
export const WORD_SETS: WordSet[] = [
  // Colors
  { id: 1, theme: 'Colors', words: ['BLACK', 'WHITE', 'GREEN', 'BROWN', 'CORAL'] },
  { id: 2, theme: 'More Colors', words: ['BEIGE', 'IVORY', 'MAUVE', 'AMBER', 'PEACH'] },
  
  // Animals
  { id: 3, theme: 'Farm Animals', words: ['HORSE', 'SHEEP', 'GOOSE', 'CHICK', 'SWINE'] },
  { id: 4, theme: 'Wild Animals', words: ['TIGER', 'ZEBRA', 'PANDA', 'KOALA', 'MOOSE'] },
  { id: 5, theme: 'Sea Creatures', words: ['WHALE', 'SHARK', 'SQUID', 'CORAL', 'CLAMS'] },
  { id: 6, theme: 'Birds', words: ['EAGLE', 'CRANE', 'STORK', 'RAVEN', 'FINCH'] },
  
  // Body Parts
  { id: 7, theme: 'Body Parts', words: ['HEART', 'BRAIN', 'HANDS', 'SPINE', 'LIVER'] },
  { id: 8, theme: 'Face Parts', words: ['MOUTH', 'TEETH', 'CHEEK', 'BROWS', 'SKULL'] },
  
  // Numbers & Time
  { id: 9, theme: 'Numbers', words: ['THREE', 'SEVEN', 'EIGHT', 'FIFTY', 'FORTY'] },
  { id: 10, theme: 'Time Words', words: ['MONTH', 'YEARS', 'WEEKS', 'HOURS', 'TODAY'] },
  
  // Emotions
  { id: 11, theme: 'Positive Feelings', words: ['HAPPY', 'PROUD', 'BRAVE', 'CHARM', 'BLISS'] },
  { id: 12, theme: 'Negative Feelings', words: ['ANGRY', 'SCARY', 'GRIEF', 'PANIC', 'SHAME'] },
  
  // Nature
  { id: 13, theme: 'Weather', words: ['STORM', 'CLOUD', 'SUNNY', 'FROST', 'FOGGY'] },
  { id: 14, theme: 'Plants', words: ['MAPLE', 'TULIP', 'DAISY', 'FERNS', 'GRASS'] },
  { id: 15, theme: 'Landscapes', words: ['BEACH', 'CLIFF', 'RIVER', 'HILLS', 'SWAMP'] },
  
  // Food & Drinks
  { id: 16, theme: 'Fruits', words: ['APPLE', 'GRAPE', 'LEMON', 'MANGO', 'PEACH'] },
  { id: 17, theme: 'Vegetables', words: ['ONION', 'BEANS', 'CARROT', 'MAIZE', 'OLIVE'] },
  { id: 18, theme: 'Drinks', words: ['WATER', 'JUICE', 'LATTE', 'MOCHA', 'CIDER'] },
  
  // Home & Objects
  { id: 19, theme: 'Furniture', words: ['CHAIR', 'TABLE', 'COUCH', 'SHELF', 'STOOL'] },
  { id: 20, theme: 'Kitchen Items', words: ['KNIFE', 'SPOON', 'PLATE', 'BOWLS', 'GLASS'] },
  
  // Action Verbs
  { id: 21, theme: 'Movement Verbs', words: ['CLIMB', 'DANCE', 'MARCH', 'SLIDE', 'SWING'] },
  { id: 22, theme: 'Communication', words: ['SPEAK', 'WRITE', 'SHOUT', 'SING', 'LAUGH'] },
  
  // Adjectives
  { id: 23, theme: 'Size Words', words: ['LARGE', 'SMALL', 'GIANT', 'DWARF', 'GRAND'] },
  { id: 24, theme: 'Texture Words', words: ['ROUGH', 'SMOOTH', 'SILKY', 'BUMPY', 'FUZZY'] },
  { id: 25, theme: 'Speed Words', words: ['QUICK', 'RAPID', 'SWIFT', 'HASTY', 'BRISK'] },
];

// Hard mode: Question-answer pairs with hints (English vocabulary definitions)
export const HARD_QUESTIONS: HardQuestion[] = [
  // Vocabulary Definitions - Easy
  { id: 1, question: 'What word means "extremely happy"?', answer: 'ELATED', hint: 'Feeling great joy' },
  { id: 2, question: 'What word means "to make larger"?', answer: 'EXPAND', hint: 'Opposite of shrink' },
  { id: 3, question: 'What word means "happening every year"?', answer: 'ANNUAL', hint: 'Once per year' },
  { id: 4, question: 'What word means "easy to understand"?', answer: 'SIMPLE', hint: 'Not complex' },
  { id: 5, question: 'What word means "to look quickly"?', answer: 'GLANCE', hint: 'A brief look' },

  // Vocabulary Definitions - Medium
  { id: 6, question: 'What word means "extremely tired"?', answer: 'WEARY', hint: 'Worn out' },
  { id: 7, question: 'What word means "to persuade or influence"?', answer: 'SWAY', hint: 'Move opinion' },
  { id: 8, question: 'What word means "a strong desire"?', answer: 'YEARN', hint: 'To long for' },
  { id: 9, question: 'What word means "to shine brightly"?', answer: 'GLEAM', hint: 'A flash of light' },
  { id: 10, question: 'What word means "brief and to the point"?', answer: 'TERSE', hint: 'Concise' },

  // Synonyms
  { id: 11, question: 'What is a synonym for "begin"?', answer: 'START', hint: 'To commence' },
  { id: 12, question: 'What is a synonym for "angry"?', answer: 'IRATE', hint: 'Very mad' },
  { id: 13, question: 'What is a synonym for "brave"?', answer: 'BOLD', hint: 'Courageous' },
  { id: 14, question: 'What is a synonym for "smart"?', answer: 'CLEVER', hint: 'Intelligent' },
  { id: 15, question: 'What is a synonym for "old"?', answer: 'ANCIENT', hint: 'Very old' },

  // Antonyms
  { id: 16, question: 'What is an antonym of "loud"?', answer: 'QUIET', hint: 'Not noisy' },
  { id: 17, question: 'What is an antonym of "fast"?', answer: 'SLOW', hint: 'Not quick' },
  { id: 18, question: 'What is an antonym of "deep"?', answer: 'SHALLOW', hint: 'Not deep' },
  { id: 19, question: 'What is an antonym of "rough"?', answer: 'SMOOTH', hint: 'Not bumpy' },
  { id: 20, question: 'What is an antonym of "wet"?', answer: 'DRY', hint: 'Not moist' },

  // Word Roots & Origins
  { id: 21, question: 'What word from Latin means "to carry"?', answer: 'FERRY', hint: 'Transport across water' },
  { id: 22, question: 'What word comes from "graph" meaning write?', answer: 'DRAFT', hint: 'A written plan' },
  { id: 23, question: 'What word relates to "aqua" (water)?', answer: 'FLUID', hint: 'Liquid state' },
  { id: 24, question: 'What word relates to "terra" (earth)?', answer: 'TERRAIN', hint: 'Land surface' },
  { id: 25, question: 'What word relates to "solar" (sun)?', answer: 'SUNNY', hint: 'Full of sunshine' },

  // Grammar Terms
  { id: 26, question: 'What punctuation ends a question?', answer: 'QUERY', hint: 'Question mark symbol' },
  { id: 27, question: 'A word that describes a noun is called?', answer: 'ADJECTIVE', hint: 'Describes things' },
  { id: 28, question: 'A word that shows action is called?', answer: 'VERB', hint: 'Action word' },
  { id: 29, question: 'Words that name things are called?', answer: 'NOUNS', hint: 'Person, place, thing' },
  { id: 30, question: 'A word that replaces a noun is called?', answer: 'PRONOUN', hint: 'He, she, it' },

  // Idiom Meanings
  { id: 31, question: 'In "raining cats and dogs", what does it mean?', answer: 'HEAVY', hint: 'Intense rain' },
  { id: 32, question: '"Once in a blue moon" means?', answer: 'RARE', hint: 'Very seldom' },
  { id: 33, question: '"Piece of cake" means something is?', answer: 'EASY', hint: 'Not difficult' },
  { id: 34, question: '"Break a leg" is used to wish someone?', answer: 'LUCK', hint: 'Good fortune' },
  { id: 35, question: '"Under the weather" means feeling?', answer: 'ILL', hint: 'Sick' },

  // Word Patterns
  { id: 36, question: 'What 5-letter word starts and ends with same letter?', answer: 'KAYAK', hint: 'Boat for paddling' },
  { id: 37, question: 'What word has all 5 vowels in order?', answer: 'FACETIOUS', hint: 'Joking' },
  { id: 38, question: 'A word spelled same forwards & backwards?', answer: 'RADAR', hint: 'Detection system' },
  { id: 39, question: 'What 5-letter word has no vowels?', answer: 'GLYPH', hint: 'Carved symbol' },
  { id: 40, question: 'What word has 3 double letters in a row?', answer: 'BOOKKEEPER', hint: 'Handles accounts' },

  // Homophones
  { id: 41, question: 'What sounds like "there" but means "belonging to them"?', answer: 'THEIR', hint: 'Possessive form' },
  { id: 42, question: 'What sounds like "write" but means "correct"?', answer: 'RIGHT', hint: 'Opposite of wrong' },
  { id: 43, question: 'What sounds like "flower" but means "ground grains"?', answer: 'FLOUR', hint: 'For baking' },
  { id: 44, question: 'What sounds like "steel" but means "to take"?', answer: 'STEAL', hint: 'To rob' },
  { id: 45, question: 'What sounds like "wait" but means "heaviness"?', answer: 'WEIGHT', hint: 'Measured in pounds' },

  // More Vocabulary
  { id: 46, question: 'What word means "a group of birds"?', answer: 'FLOCK', hint: 'Flying together' },
  { id: 47, question: 'What word means "the edge of something"?', answer: 'BRINK', hint: 'Border or verge' },
  { id: 48, question: 'What word means "to look at with wide eyes"?', answer: 'STARE', hint: 'Fixed gaze' },
  { id: 49, question: 'What word means "a sudden attack"?', answer: 'RAID', hint: 'Surprise assault' },
  { id: 50, question: 'What word means "to avoid something"?', answer: 'EVADE', hint: 'Escape from' },
];

// Helper function to get random word set for Easy mode
export function getRandomWordSet(): WordSet {
  const randomIndex = Math.floor(Math.random() * WORD_SETS.length);
  return WORD_SETS[randomIndex];
}

// Helper function to get random question for Hard mode
export function getRandomQuestion(excludeIds: number[] = []): HardQuestion | null {
  const available = HARD_QUESTIONS.filter(q => !excludeIds.includes(q.id));
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

// Helper to get a set of questions for a Hard mode session
export function getHardModeQuestions(count: number = 5): HardQuestion[] {
  const shuffled = [...HARD_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
