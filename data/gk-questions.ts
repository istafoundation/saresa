// General Knowledge Questions - Hindu Mythology
// Categories: epics, gods, stories, culture

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'epics' | 'gods' | 'stories' | 'culture';
  funFact?: string;
}

export const GK_QUESTIONS: Question[] = [
  // EASY - Gods
  {
    id: 'e1',
    question: 'Who is known as the remover of obstacles?',
    options: ['Hanuman', 'Ganesha', 'Shiva', 'Vishnu'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'gods',
    funFact: 'Ganesha is always worshipped first before any new beginning!',
  },
  {
    id: 'e2',
    question: 'What instrument does Lord Krishna play?',
    options: ['Drums', 'Veena', 'Flute', 'Sitar'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'gods',
  },
  {
    id: 'e3',
    question: 'Who is the king of all gods in Hindu mythology?',
    options: ['Brahma', 'Vishnu', 'Shiva', 'Indra'],
    correctIndex: 3,
    difficulty: 'easy',
    category: 'gods',
  },
  {
    id: 'e4',
    question: 'What animal is Lord Ganesha\'s vehicle (vahana)?',
    options: ['Lion', 'Mouse', 'Bull', 'Peacock'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'gods',
  },
  {
    id: 'e5',
    question: 'Who wrote the epic Ramayana?',
    options: ['Vyasa', 'Valmiki', 'Kalidasa', 'Tulsidas'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'epics',
  },
  {
    id: 'e6',
    question: 'What is the sacred river that flows from Lord Shiva\'s hair?',
    options: ['Yamuna', 'Saraswati', 'Ganga', 'Kaveri'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'culture',
  },
  {
    id: 'e7',
    question: 'How many heads does Lord Brahma have?',
    options: ['One', 'Two', 'Three', 'Four'],
    correctIndex: 3,
    difficulty: 'easy',
    category: 'gods',
  },
  {
    id: 'e8',
    question: 'Who is Lord Rama\'s wife?',
    options: ['Radha', 'Sita', 'Parvati', 'Lakshmi'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'epics',
  },
  {
    id: 'e9',
    question: 'What is Lord Shiva\'s vehicle?',
    options: ['Lion', 'Mouse', 'Nandi the Bull', 'Garuda'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'gods',
  },
  {
    id: 'e10',
    question: 'Which festival celebrates the victory of good over evil with Lord Rama\'s return?',
    options: ['Holi', 'Diwali', 'Navratri', 'Pongal'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'culture',
  },

  // MEDIUM - Epics & Stories
  {
    id: 'm1',
    question: 'Who was Arjuna\'s charioteer in the Mahabharata war?',
    options: ['Bheeshma', 'Karna', 'Krishna', 'Drona'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm2',
    question: 'How many years were the Pandavas exiled in the forest?',
    options: ['10 years', '12 years', '13 years', '14 years'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'epics',
    funFact: '12 years in forest + 1 year incognito = 13 total years of exile',
  },
  {
    id: 'm3',
    question: 'Which demon king kidnapped Sita?',
    options: ['Kumbhakarna', 'Ravana', 'Vibhishana', 'Meghanada'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm4',
    question: 'Who built the bridge to Lanka?',
    options: ['Rama', 'Hanuman', 'Vanara Army', 'Sugriva'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm5',
    question: 'What is the name of Vishnu\'s eagle vehicle?',
    options: ['Jatayu', 'Garuda', 'Sampati', 'Pakshi'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'gods',
  },
  {
    id: 'm6',
    question: 'Who was Karna\'s real mother?',
    options: ['Kunti', 'Gandhari', 'Radha', 'Draupadi'],
    correctIndex: 0,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm7',
    question: 'What weapon did Lord Shiva use to destroy the three cities (Tripura)?',
    options: ['Trishul', 'A single arrow', 'Damaru', 'Third eye'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'stories',
  },
  {
    id: 'm8',
    question: 'Who gave the Bhagavad Gita discourse?',
    options: ['Arjuna', 'Vyasa', 'Krishna', 'Bheeshma'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm9',
    question: 'How many avatars does Lord Vishnu have in the Dashavatara?',
    options: ['7', '9', '10', '12'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'gods',
  },
  {
    id: 'm10',
    question: 'What mountain did Krishna lift to protect villagers from Indra\'s rain?',
    options: ['Mount Meru', 'Govardhan Hill', 'Himalayas', 'Vindhyas'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'stories',
  },
  {
    id: 'm11',
    question: 'Who was the guru of both Pandavas and Kauravas?',
    options: ['Kripacharya', 'Dronacharya', 'Parashurama', 'Bhishma'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm12',
    question: 'What is the name of Arjuna\'s bow?',
    options: ['Pinaka', 'Gandiva', 'Vijaya', 'Sharanga'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm13',
    question: 'Which Pandava was known for his strength?',
    options: ['Yudhishthira', 'Arjuna', 'Bhima', 'Nakula'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm14',
    question: 'Who was cursed to become a woman and later a man again?',
    options: ['Arjuna', 'Shikhandi', 'Bhishma', 'Drona'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'epics',
  },
  {
    id: 'm15',
    question: 'What did Hanuman bring from the Himalayas to save Lakshmana?',
    options: ['Sanjeevani herb', 'Holy water', 'Divine nectar', 'Golden arrow'],
    correctIndex: 0,
    difficulty: 'medium',
    category: 'epics',
  },

  // HARD - Deep Knowledge
  {
    id: 'h1',
    question: 'Which sage is said to have composed the Mahabharata?',
    options: ['Valmiki', 'Narada', 'Vyasa', 'Vasishtha'],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'epics',
  },
  {
    id: 'h2',
    question: 'What is Lord Shiva\'s cosmic dance called?',
    options: ['Lasya', 'Tandava', 'Kathak', 'Bharatanatyam'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'gods',
  },
  {
    id: 'h3',
    question: 'How many Vedas are there?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'culture',
    funFact: 'The four Vedas are: Rig, Sama, Yajur, and Atharva Veda',
  },
  {
    id: 'h4',
    question: 'What weapon was given to Arjuna by Lord Shiva?',
    options: ['Brahmastra', 'Narayanastra', 'Pashupatastra', 'Varunastra'],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'epics',
  },
  {
    id: 'h5',
    question: 'Who is the father of Hanuman?',
    options: ['Sugriva', 'Vayu (Wind God)', 'Indra', 'Surya'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'gods',
  },
  {
    id: 'h6',
    question: 'What are the three qualities (gunas) in Hindu philosophy?',
    options: ['Karma, Dharma, Moksha', 'Sattva, Rajas, Tamas', 'Brahma, Vishnu, Shiva', 'Artha, Kama, Moksha'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'culture',
  },
  {
    id: 'h7',
    question: 'Which demon did Lord Narasimha (Vishnu\'s avatar) kill?',
    options: ['Ravana', 'Hiranyakashipu', 'Mahishasura', 'Bhasmasura'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'stories',
  },
  {
    id: 'h8',
    question: 'What emerged from the Samudra Manthan (churning of ocean)?',
    options: ['Only Amrit', 'Only Poison', 'Both Amrit and Halahala poison', 'Lakshmi only'],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'stories',
  },
  {
    id: 'h9',
    question: 'How many chapters are in the Bhagavad Gita?',
    options: ['12', '15', '18', '21'],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'culture',
  },
  {
    id: 'h10',
    question: 'Who was the 100th son of Dhritarashtra?',
    options: ['Dushasana', 'Duryodhana', 'Vikarna', 'Dussala (daughter, trick question!)'],
    correctIndex: 3,
    difficulty: 'hard',
    category: 'epics',
    funFact: 'Dhritarashtra had 100 sons and 1 daughter, Dussala!',
  },
  {
    id: 'h11',
    question: 'What is the name of Duryodhana\'s mace?',
    options: ['Bhairava', 'Gada', 'Kaumodaki', 'No specific name'],
    correctIndex: 3,
    difficulty: 'hard',
    category: 'epics',
  },
  {
    id: 'h12',
    question: 'Who taught Parashurama the art of warfare?',
    options: ['Vishnu', 'Shiva', 'Indra', 'Brahma'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'stories',
  },
  {
    id: 'h13',
    question: 'What is the first avatar of Vishnu?',
    options: ['Kurma (Tortoise)', 'Matsya (Fish)', 'Varaha (Boar)', 'Narasimha'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'gods',
  },
  {
    id: 'h14',
    question: 'Who was the charioteer of Karna during the Kurukshetra war?',
    options: ['Krishna', 'Shalya', 'Drona', 'Ashwatthama'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'epics',
  },
  {
    id: 'h15',
    question: 'What is the cosmic serpent on which Vishnu rests called?',
    options: ['Vasuki', 'Shesha (Ananta)', 'Takshaka', 'Karkotaka'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'gods',
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
