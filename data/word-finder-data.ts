// Word Finder game data - Word sets for Easy mode and Questions for Hard mode

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

// Easy mode: 5-word themed sets (mythology focused)
export const WORD_SETS: WordSet[] = [
  // Ramayana Theme
  { id: 1, theme: 'Ramayana Heroes', words: ['RAMA', 'SITA', 'HANUMAN', 'LAXMAN', 'BHARAT'] },
  { id: 2, theme: 'Ramayana Villains', words: ['RAVANA', 'KUMBH', 'SURPA', 'VIBHI', 'MEGHA'] },
  { id: 3, theme: 'Ramayana Places', words: ['LANKA', 'AYODH', 'PANCHV', 'KISHK', 'MITHIL'] },
  
  // Mahabharata Theme
  { id: 4, theme: 'Pandavas', words: ['ARJUN', 'BHEEM', 'YUDHI', 'NAKUL', 'SAHED'] },
  { id: 5, theme: 'Kauravas', words: ['DURYO', 'DUSHAS', 'KARNA', 'SHAKUN', 'DRONA'] },
  { id: 6, theme: 'Mahabharata Women', words: ['DRUPA', 'KUNTI', 'GANDH', 'SUBHA', 'UTTARA'] },
  
  // Gods & Goddesses
  { id: 7, theme: 'Trinity', words: ['BRAHM', 'VISHN', 'SHIVA', 'SARAS', 'LAXMI'] },
  { id: 8, theme: 'Avatars', words: ['MATSY', 'KURMA', 'VARAH', 'NARSI', 'VAMAN'] },
  { id: 9, theme: 'Goddesses', words: ['DURGA', 'KALI', 'PARVT', 'RADHA', 'GAYAT'] },
  
  // Weapons & Items
  { id: 10, theme: 'Divine Weapons', words: ['TRISH', 'CHAKR', 'GANDA', 'VAJRA', 'PINAKA'] },
  { id: 11, theme: 'Sacred Items', words: ['VEENA', 'LOTUS', 'CONCH', 'MACE', 'CROWN'] },
  
  // Elements & Nature
  { id: 12, theme: 'Panchabhoota', words: ['EARTH', 'WATER', 'FIRE', 'AIR', 'SPACE'] },
  { id: 13, theme: 'Sacred Animals', words: ['NANDI', 'GARUD', 'MOOSH', 'AIRAV', 'SHESH'] },
  
  // Sages & Saints
  { id: 14, theme: 'Great Sages', words: ['VYASA', 'VALMI', 'NARDA', 'AGAST', 'BHRIGU'] },
  { id: 15, theme: 'Seven Rishis', words: ['ATRI', 'VASISH', 'KASYAP', 'GOTAM', 'JAMDA'] },
  
  // Concepts
  { id: 16, theme: 'Yogic Terms', words: ['KARMA', 'DHARM', 'MOKSH', 'ATMAN', 'MAYA'] },
  { id: 17, theme: 'Sacred Texts', words: ['VEDAS', 'GITA', 'PURAN', 'UPANI', 'SUTRA'] },
  
  // Krishna Leela
  { id: 18, theme: 'Krishna Story', words: ['GOPAL', 'GOVID', 'YASHO', 'NANDA', 'BALRAM'] },
  { id: 19, theme: 'Vrindavan', words: ['FLUTE', 'GOPIS', 'YAMUN', 'BUTTER', 'DANCE'] },
  
  // Festivals
  { id: 20, theme: 'Festivals', words: ['DIWALI', 'HOLI', 'NAVRT', 'DURGA', 'GANESH'] },
  
  // More word sets for variety
  { id: 21, theme: 'Demons', words: ['ASURA', 'DANAV', 'RAKSHAS', 'MAHISH', 'TARAK'] },
  { id: 22, theme: 'Heavenly', words: ['DEVAS', 'INDRA', 'VARUN', 'AGNI', 'VAYU'] },
  { id: 23, theme: 'Sacred Rivers', words: ['GANGA', 'YAMUN', 'SARAS', 'GODAV', 'KAVERI'] },
  { id: 24, theme: 'Mountains', words: ['KAILASH', 'MERU', 'MANDARA', 'HIMAV', 'VINDHYA'] },
  { id: 25, theme: 'Kingdoms', words: ['HASTIN', 'INDRAP', 'DWARKA', 'MATHUR', 'KASHI'] },
];

// Hard mode: Question-answer pairs with hints
export const HARD_QUESTIONS: HardQuestion[] = [
  // Ramayana
  { id: 1, question: 'Who killed the demon king Ravana?', answer: 'RAMA', hint: 'Prince of Ayodhya' },
  { id: 2, question: 'Who is the monkey god in Ramayana?', answer: 'HANUMAN', hint: 'Son of Vayu' },
  { id: 3, question: 'Who was abducted by Ravana?', answer: 'SITA', hint: 'Wife of Rama' },
  { id: 4, question: 'Which kingdom did Ravana rule?', answer: 'LANKA', hint: 'Island kingdom' },
  { id: 5, question: 'Who built the bridge to Lanka?', answer: 'NALA', hint: 'Vanara architect' },
  
  // Mahabharata
  { id: 6, question: 'Who was the greatest archer in Mahabharata?', answer: 'ARJUNA', hint: 'Third Pandava' },
  { id: 7, question: 'Who narrated the Bhagavad Gita?', answer: 'KRISHNA', hint: 'Eighth avatar of Vishnu' },
  { id: 8, question: 'Who was the blind king in Mahabharata?', answer: 'DHRIT', hint: 'Father of Kauravas' },
  { id: 9, question: 'Who was known for his strength among Pandavas?', answer: 'BHEEM', hint: 'Second Pandava' },
  { id: 10, question: 'Who was the teacher of both Pandavas and Kauravas?', answer: 'DRONA', hint: 'Guru of archery' },
  
  // Gods
  { id: 11, question: 'Who is the destroyer in the Holy Trinity?', answer: 'SHIVA', hint: 'Has a third eye' },
  { id: 12, question: 'Who is the preserver in the Holy Trinity?', answer: 'VISHNU', hint: 'Has a discus' },
  { id: 13, question: 'Who is the creator in the Holy Trinity?', answer: 'BRAHMA', hint: 'Has four heads' },
  { id: 14, question: 'Who is the god of thunder and rain?', answer: 'INDRA', hint: 'King of Devas' },
  { id: 15, question: 'Who is the god of fire?', answer: 'AGNI', hint: 'Consumes offerings' },
  
  // Goddesses
  { id: 16, question: 'Who killed the buffalo demon Mahishasura?', answer: 'DURGA', hint: 'Has ten arms' },
  { id: 17, question: 'Who is the goddess of wealth?', answer: 'LAXMI', hint: 'Wife of Vishnu' },
  { id: 18, question: 'Who is the goddess of knowledge?', answer: 'SARAS', hint: 'Plays the veena' },
  { id: 19, question: 'Who is the fierce form of Shakti?', answer: 'KALI', hint: 'Has a garland of skulls' },
  { id: 20, question: 'Who is the consort of Lord Shiva?', answer: 'PARVATI', hint: 'Daughter of Himavan' },
  
  // Weapons
  { id: 21, question: 'What is the trident of Lord Shiva called?', answer: 'TRISHUL', hint: 'Three-pronged weapon' },
  { id: 22, question: 'What is the discus of Lord Vishnu called?', answer: 'CHAKRA', hint: 'Spinning weapon' },
  { id: 23, question: 'What is the bow of Lord Shiva called?', answer: 'PINAKA', hint: 'Divine bow' },
  { id: 24, question: 'What weapon did Indra use?', answer: 'VAJRA', hint: 'Thunderbolt' },
  { id: 25, question: 'What is the mace of Bheem called?', answer: 'GADA', hint: 'Heavy club' },
  
  // Sacred Animals
  { id: 26, question: 'What is the vehicle of Lord Shiva?', answer: 'NANDI', hint: 'Sacred bull' },
  { id: 27, question: 'What is the vehicle of Lord Vishnu?', answer: 'GARUDA', hint: 'King of birds' },
  { id: 28, question: 'What is the vehicle of Lord Ganesha?', answer: 'MOOSHAK', hint: 'Small creature' },
  { id: 29, question: 'What is the vehicle of Goddess Durga?', answer: 'SIMHA', hint: 'King of jungle' },
  { id: 30, question: 'What is the thousand-headed serpent?', answer: 'SHESHA', hint: 'Vishnu rests on it' },
  
  // Concepts
  { id: 31, question: 'What is the cycle of action and consequence called?', answer: 'KARMA', hint: 'What goes around...' },
  { id: 32, question: 'What is righteous duty called?', answer: 'DHARMA', hint: 'Path of righteousness' },
  { id: 33, question: 'What is liberation from rebirth called?', answer: 'MOKSHA', hint: 'Ultimate goal' },
  { id: 34, question: 'What is the soul called in Sanskrit?', answer: 'ATMAN', hint: 'Inner self' },
  { id: 35, question: 'What is cosmic illusion called?', answer: 'MAYA', hint: 'World of illusion' },
  
  // Texts
  { id: 36, question: 'Which text contains the song of the Lord?', answer: 'GITA', hint: 'Krishna\'s teachings' },
  { id: 37, question: 'What are the oldest sacred texts called?', answer: 'VEDAS', hint: 'Four in number' },
  { id: 38, question: 'Who wrote the Mahabharata?', answer: 'VYASA', hint: 'Also called Ved Vyasa' },
  { id: 39, question: 'Who wrote the Ramayana?', answer: 'VALMIKI', hint: 'First poet (Adi Kavi)' },
  
  // Places
  { id: 40, question: 'Where is Lord Shiva\'s abode?', answer: 'KAILASH', hint: 'Sacred mountain' },
  { id: 41, question: 'What is Krishna\'s underwater kingdom called?', answer: 'DWARKA', hint: 'City of gates' },
  { id: 42, question: 'Where did Krishna grow up?', answer: 'VRINDA', hint: 'Land of tulsi' },
  { id: 43, question: 'Which river descended from heaven?', answer: 'GANGA', hint: 'Most sacred river' },
  
  // Avatars
  { id: 44, question: 'Which avatar was half-man half-lion?', answer: 'NARASIMHA', hint: 'Fourth avatar' },
  { id: 45, question: 'Which avatar was a fish?', answer: 'MATSYA', hint: 'First avatar' },
  { id: 46, question: 'Which avatar was a tortoise?', answer: 'KURMA', hint: 'Second avatar' },
  { id: 47, question: 'Which avatar was a boar?', answer: 'VARAHA', hint: 'Third avatar' },
  { id: 48, question: 'Which avatar was a dwarf?', answer: 'VAMANA', hint: 'Fifth avatar' },
  
  // Sages
  { id: 49, question: 'Who is the celestial sage with a veena?', answer: 'NARADA', hint: 'Travels between worlds' },
  { id: 50, question: 'Which sage drank the ocean?', answer: 'AGASTYA', hint: 'Southern sage' },
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
