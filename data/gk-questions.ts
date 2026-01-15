// English Insane - Hard English Grammar Questions
// Categories: grammar, vocabulary, idioms, syntax

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'grammar' | 'vocabulary' | 'idioms' | 'syntax';
  explanation: string; // Shown when user answers incorrectly in Practice mode
}

export const GK_QUESTIONS: Question[] = [
  // EASY - Grammar Basics
  {
    id: 'e1',
    question: 'Which sentence is grammatically correct?',
    options: ['She don\'t like apples', 'She doesn\'t like apples', 'She not like apples', 'She no like apples'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'grammar',
    explanation: '"Doesn\'t" is the correct contraction of "does not" used with third-person singular subjects (he/she/it).',
  },
  {
    id: 'e2',
    question: 'Choose the correct article: "___ apple a day keeps the doctor away."',
    options: ['A', 'An', 'The', 'No article needed'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'grammar',
    explanation: 'Use "an" before words that start with a vowel sound. "Apple" starts with the vowel "a".',
  },
  {
    id: 'e3',
    question: 'What is the past tense of "go"?',
    options: ['Goed', 'Gone', 'Went', 'Going'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'grammar',
    explanation: '"Go" is an irregular verb. Its past tense is "went" and past participle is "gone".',
  },
  {
    id: 'e4',
    question: 'Which word is a synonym for "happy"?',
    options: ['Sad', 'Joyful', 'Angry', 'Tired'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'vocabulary',
    explanation: '"Joyful" means feeling or expressing great happiness, making it a synonym for "happy".',
  },
  {
    id: 'e5',
    question: 'Complete the sentence: "Neither John ___ Mary was at the party."',
    options: ['or', 'and', 'nor', 'but'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'syntax',
    explanation: '"Neither...nor" is a correlative conjunction pair used to negate two alternatives.',
  },
  {
    id: 'e6',
    question: 'What does the idiom "break the ice" mean?',
    options: ['Destroy frozen water', 'Start a conversation', 'Feel cold', 'Break something'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'idioms',
    explanation: '"Break the ice" means to initiate a conversation or ease tension in a social situation.',
  },
  {
    id: 'e7',
    question: 'Which is the correct plural of "child"?',
    options: ['Childs', 'Childes', 'Children', 'Childrens'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'grammar',
    explanation: '"Child" is an irregular noun. Its plural form is "children", not "childs".',
  },
  {
    id: 'e8',
    question: 'What is an antonym of "ancient"?',
    options: ['Old', 'Modern', 'Historic', 'Traditional'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'vocabulary',
    explanation: '"Modern" means relating to the present time, which is the opposite of "ancient" (very old).',
  },
  {
    id: 'e9',
    question: 'Choose the correct pronoun: "Give the book to ___."',
    options: ['I', 'me', 'myself', 'mine'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'grammar',
    explanation: '"Me" is the objective pronoun used after prepositions like "to". "I" is a subject pronoun.',
  },
  {
    id: 'e10',
    question: 'What punctuation mark ends an interrogative sentence?',
    options: ['Period', 'Exclamation mark', 'Question mark', 'Comma'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'syntax',
    explanation: 'Interrogative sentences are questions, and all questions end with a question mark (?).',
  },

  // MEDIUM - Grammar & Vocabulary
  {
    id: 'm1',
    question: 'Which sentence uses the subjunctive mood correctly?',
    options: ['I wish I was taller', 'I wish I were taller', 'I wish I am taller', 'I wish I be taller'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'grammar',
    explanation: 'The subjunctive mood uses "were" for hypothetical situations, regardless of the subject.',
  },
  {
    id: 'm2',
    question: 'What does "ubiquitous" mean?',
    options: ['Rare', 'Present everywhere', 'Unique', 'Invisible'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'vocabulary',
    explanation: '"Ubiquitous" comes from Latin and means appearing or found everywhere; omnipresent.',
  },
  {
    id: 'm3',
    question: 'Identify the dangling modifier: "Running quickly, the bus was missed."',
    options: ['Running quickly', 'the bus', 'was missed', 'No dangling modifier'],
    correctIndex: 0,
    difficulty: 'medium',
    category: 'syntax',
    explanation: '"Running quickly" dangles because the bus wasn\'t running—the person was. Correct: "Running quickly, she missed the bus."',
  },
  {
    id: 'm4',
    question: 'What does "to let the cat out of the bag" mean?',
    options: ['Free an animal', 'Reveal a secret', 'Make a mistake', 'Start trouble'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'idioms',
    explanation: 'This idiom means to reveal a secret or disclose something that was meant to be hidden.',
  },
  {
    id: 'm5',
    question: 'Which word is spelled correctly?',
    options: ['Accomodate', 'Accommodate', 'Acommodate', 'Acomodate'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'vocabulary',
    explanation: '"Accommodate" has two c\'s and two m\'s. A common mnemonic: it\'s big enough to accommodate two c\'s and two m\'s.',
  },
  {
    id: 'm6',
    question: 'What is the difference between "affect" and "effect"?',
    options: ['They are the same', 'Affect is a noun, effect is a verb', 'Affect is a verb, effect is a noun', 'Both are verbs'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'grammar',
    explanation: '"Affect" is typically a verb (to influence), while "effect" is typically a noun (a result). Think: A for Action (verb).',
  },
  {
    id: 'm7',
    question: 'Complete: "If I ___ you, I would apologize."',
    options: ['am', 'was', 'were', 'be'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'grammar',
    explanation: 'Use "were" (subjunctive) in hypothetical conditional sentences, even with "I" or "he/she".',
  },
  {
    id: 'm8',
    question: 'What is a "malapropism"?',
    options: ['A type of metaphor', 'Mistaken use of a similar-sounding word', 'A grammatical error', 'A figure of speech'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'vocabulary',
    explanation: 'A malapropism is the mistaken use of a word in place of a similar-sounding one, often with humorous effect.',
  },
  {
    id: 'm9',
    question: 'Which sentence is in the passive voice?',
    options: ['The dog bit the man', 'The man was bitten by the dog', 'The dog is biting the man', 'The man will bite the dog'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'syntax',
    explanation: 'Passive voice: subject receives the action (was bitten). Active voice: subject performs the action (bit).',
  },
  {
    id: 'm10',
    question: 'What does "to burn the midnight oil" mean?',
    options: ['Waste resources', 'Work late into the night', 'Start a fire', 'Fail at something'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'idioms',
    explanation: 'This idiom means to work or study late into the night, from the era of oil lamps.',
  },
  {
    id: 'm11',
    question: 'Choose the correct word: "The data ___ inconclusive."',
    options: ['is', 'are', 'were', 'Both A and B are acceptable'],
    correctIndex: 3,
    difficulty: 'medium',
    category: 'grammar',
    explanation: '"Data" was originally plural (datum is singular), but modern usage accepts both singular and plural forms.',
  },
  {
    id: 'm12',
    question: 'What is the meaning of "cacophony"?',
    options: ['Beautiful music', 'Harsh, discordant sounds', 'Silence', 'Rhythmic pattern'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'vocabulary',
    explanation: '"Cacophony" comes from Greek (kakos = bad, phone = sound) meaning harsh, jarring sounds.',
  },
  {
    id: 'm13',
    question: 'Which is correct: "Between you and ___"?',
    options: ['I', 'me', 'myself', 'we'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'grammar',
    explanation: '"Between" is a preposition requiring the objective case. "Me" is objective; "I" is subjective.',
  },
  {
    id: 'm14',
    question: 'What literary device is "The world is a stage"?',
    options: ['Simile', 'Metaphor', 'Hyperbole', 'Personification'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'syntax',
    explanation: 'A metaphor directly states one thing IS another. A simile would use "like" or "as".',
  },
  {
    id: 'm15',
    question: 'What does "to bite off more than you can chew" mean?',
    options: ['Eat too much', 'Take on too much responsibility', 'Speak rudely', 'Make excuses'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'idioms',
    explanation: 'This idiom means to take on more than you can handle or complete successfully.',
  },

  // HARD - Advanced Grammar
  {
    id: 'h1',
    question: 'Which sentence demonstrates the past perfect progressive tense?',
    options: [
      'She had been waiting for hours', 
      'She was waiting for hours', 
      'She has been waiting for hours', 
      'She will have been waiting'
    ],
    correctIndex: 0,
    difficulty: 'hard',
    category: 'grammar',
    explanation: 'Past perfect progressive: had + been + verb-ing. It shows an action that was ongoing before another past event.',
  },
  {
    id: 'h2',
    question: 'What is a "synecdoche"?',
    options: [
      'A type of irony', 
      'A figure of speech using part for whole', 
      'A grammatical structure', 
      'A punctuation rule'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'vocabulary',
    explanation: 'Synecdoche uses a part to represent the whole (e.g., "all hands on deck" where hands = sailors).',
  },
  {
    id: 'h3',
    question: 'Identify the sentence with correct parallel structure:',
    options: [
      'She likes dancing, singing, and to swim', 
      'She likes to dance, to sing, and swimming', 
      'She likes dancing, singing, and swimming', 
      'She likes to dance, singing, and to swim'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'syntax',
    explanation: 'Parallel structure requires consistent grammatical forms. All gerunds (-ing) or all infinitives (to + verb).',
  },
  {
    id: 'h4',
    question: 'What does "pulchritudinous" mean?',
    options: ['Ugly', 'Beautiful', 'Large', 'Intelligent'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'vocabulary',
    explanation: '"Pulchritudinous" (from Latin pulchritudo) ironically means physically beautiful, despite sounding harsh.',
  },
  {
    id: 'h5',
    question: 'Which uses the subjunctive correctly?',
    options: [
      'The teacher insists that he studies', 
      'The teacher insists that he study', 
      'The teacher insists that he studied', 
      'The teacher insists that he is studying'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'grammar',
    explanation: 'After verbs of demand/suggestion (insist, recommend), use base form subjunctive: "that he study".',
  },
  {
    id: 'h6',
    question: 'What does "to have a bee in one\'s bonnet" mean?',
    options: ['To wear a hat', 'To be obsessed with an idea', 'To be angry', 'To be confused'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'idioms',
    explanation: 'This idiom means to be preoccupied or obsessed with a particular idea or notion.',
  },
  {
    id: 'h7',
    question: 'Which is a split infinitive?',
    options: [
      'To boldly go', 
      'To go boldly', 
      'Boldly to go', 
      'Going boldly'
    ],
    correctIndex: 0,
    difficulty: 'hard',
    category: 'syntax',
    explanation: 'A split infinitive has a word between "to" and the verb. "To boldly go" splits "to go" with "boldly".',
  },
  {
    id: 'h8',
    question: 'What is the meaning of "obsequious"?',
    options: ['Rebellious', 'Excessively compliant or deferential', 'Mysterious', 'Hardworking'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'vocabulary',
    explanation: '"Obsequious" describes someone who is excessively eager to please or obey, often in a servile way.',
  },
  {
    id: 'h9',
    question: 'Which sentence uses "whom" correctly?',
    options: [
      'Whom is calling?', 
      'The person whom you met is my brother', 
      'Whom do you think is best?', 
      'I know whom did it'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'grammar',
    explanation: '"Whom" is objective case. In "whom you met", "whom" is the object of "met". Test: you met HIM (not he).',
  },
  {
    id: 'h10',
    question: 'What is "epistrophe" in rhetoric?',
    options: [
      'Repetition at the beginning', 
      'Repetition at the end', 
      'Opposite meanings', 
      'Exaggeration'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'syntax',
    explanation: 'Epistrophe: repetition at the END of clauses. Anaphora is repetition at the BEGINNING.',
  },
  {
    id: 'h11',
    question: 'Which sentence has a misplaced modifier?',
    options: [
      'She almost drove her car for six hours', 
      'She drove her car for almost six hours', 
      'Both are correct', 
      'Neither is correct'
    ],
    correctIndex: 0,
    difficulty: 'hard',
    category: 'syntax',
    explanation: '"Almost drove" implies she nearly drove but didn\'t. "Almost six hours" correctly modifies the duration.',
  },
  {
    id: 'h12',
    question: 'What is a "gerund"?',
    options: [
      'A verb ending in -ed', 
      'A verb form ending in -ing used as a noun', 
      'A type of adjective', 
      'An irregular verb'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'grammar',
    explanation: 'A gerund is a verb form ending in -ing that functions as a noun (e.g., "Swimming is fun").',
  },
  {
    id: 'h13',
    question: 'What does "sangfroid" mean?',
    options: ['Hot-tempered', 'Composure under pressure', 'A type of wine', 'Sadness'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'vocabulary',
    explanation: '"Sangfroid" (French: cold blood) means composure or coolness under strain or danger.',
  },
  {
    id: 'h14',
    question: 'What is the difference between "who" and "that" for people?',
    options: [
      'They are always interchangeable', 
      '"Who" is preferred for people; "that" for things', 
      '"That" is preferred for people', 
      'There is no difference'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'grammar',
    explanation: '"Who" is preferred when referring to people. "That" can refer to people but is more commonly used for things.',
  },
  {
    id: 'h15',
    question: 'What does "to throw in the towel" originate from?',
    options: ['Cleaning', 'Boxing', 'Swimming', 'Cooking'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'idioms',
    explanation: 'This idiom (to give up) comes from boxing, where a trainer throws a towel into the ring to concede defeat.',
  },
];

// Get random questions for quiz
export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...GK_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Get questions by difficulty
export function getQuestionsByDifficulty(difficulty: Question['difficulty'], count: number): Question[] {
  const filtered = GK_QUESTIONS.filter(q => q.difficulty === difficulty);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, filtered.length));
}
