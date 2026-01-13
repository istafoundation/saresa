// Fun facts for the detective mascot to share
// Word of the day, Easter egg hints, and random mythology facts

export interface FunFact {
  fact: string;
  category: 'mythology' | 'history' | 'trivia' | 'wisdom';
}

export interface WordOfTheDay {
  word: string;
  meaning: string;
  origin?: string;
}

export interface EasterEggHint {
  hint: string;
  targetScreen?: string;
}

export const FUN_FACTS: FunFact[] = [
  // Mythology
  { fact: "The Mahabharata is 10 times longer than the Iliad and Odyssey combined!", category: 'mythology' },
  { fact: "Hanuman once swallowed the sun thinking it was a mango!", category: 'mythology' },
  { fact: "Lord Vishnu has taken 10 avatars including a fish, tortoise, and boar!", category: 'mythology' },
  { fact: "The Bhagavad Gita contains 700 verses of wisdom told in the middle of a battlefield!", category: 'mythology' },
  { fact: "Ganesha's head was originally human before it became an elephant's!", category: 'mythology' },
  { fact: "The Gandiva bow produced thunder sounds when Arjuna drew it!", category: 'mythology' },
  { fact: "Ravana was actually a great scholar who wrote books on music and medicine!", category: 'mythology' },
  { fact: "Lord Shiva drank poison to save the universe, turning his throat blue!", category: 'mythology' },
  { fact: "The Samudra Manthan (ocean churning) produced 14 precious things!", category: 'mythology' },
  { fact: "Karna's kavach (armor) made him virtually invincible since birth!", category: 'mythology' },
  
  // History
  { fact: "The Vedas are among the oldest texts in any language, over 3,500 years old!", category: 'history' },
  { fact: "Sanskrit is called the 'mother of all languages' by many scholars!", category: 'history' },
  { fact: "Ancient Indian mathematicians invented zero and the decimal system!", category: 'history' },
  { fact: "Yoga has been practiced in India for over 5,000 years!", category: 'history' },
  { fact: "The game of Chess originated in India as 'Chaturanga'!", category: 'history' },
  
  // Trivia
  { fact: "There are 330 million gods in Hindu mythology!", category: 'trivia' },
  { fact: "Om is considered the sound of the universe!", category: 'trivia' },
  { fact: "The lotus flower is sacred because it grows pure in muddy water!", category: 'trivia' },
  { fact: "Diwali celebrates 5 days of different traditions, not just one!", category: 'trivia' },
  { fact: "The cow is sacred in Hinduism as Kamadhenu, the wish-fulfilling cow!", category: 'trivia' },
  { fact: "Many Hindu temples are aligned with astronomical events!", category: 'trivia' },
  { fact: "The trishul has three prongs representing creation, preservation, destruction!", category: 'trivia' },
  
  // Wisdom
  { fact: "Karma means every action has a consequence - good or bad!", category: 'wisdom' },
  { fact: "Dharma is not just religion, it means righteous duty and moral order!", category: 'wisdom' },
  { fact: "Moksha is the liberation from the cycle of rebirth - the ultimate goal!", category: 'wisdom' },
  { fact: "Ahimsa (non-violence) is one of the highest virtues in Hindu philosophy!", category: 'wisdom' },
  { fact: "The Bhagavad Gita teaches that you have the right to work but not to the fruits!", category: 'wisdom' },
  { fact: "Namaste means 'the divine in me bows to the divine in you'!", category: 'wisdom' },
];

export const WORDS_OF_THE_DAY: WordOfTheDay[] = [
  { word: "Dharma", meaning: "Righteous duty, moral law, the cosmic order", origin: "From Sanskrit 'dhṛ' meaning to hold or support" },
  { word: "Karma", meaning: "Action and its inevitable consequences", origin: "From Sanskrit 'kṛ' meaning to do or make" },
  { word: "Moksha", meaning: "Liberation from the cycle of rebirth", origin: "From Sanskrit 'muc' meaning to release" },
  { word: "Atman", meaning: "The eternal self or soul within all beings", origin: "Related to German 'atmen' (to breathe)" },
  { word: "Prana", meaning: "Life force, vital energy, breath", origin: "From 'pra' (forth) + 'an' (to breathe)" },
  { word: "Mantra", meaning: "Sacred utterance, divine sound or phrase", origin: "From 'man' (mind) + 'tra' (tool)" },
  { word: "Avatar", meaning: "Divine incarnation, descent of a deity to Earth", origin: "From 'ava' (down) + 'tṛ' (to cross)" },
  { word: "Guru", meaning: "Teacher, one who dispels darkness", origin: "From 'gu' (darkness) + 'ru' (remover)" },
  { word: "Yoga", meaning: "Union of body, mind, and spirit", origin: "From 'yuj' meaning to yoke or join" },
  { word: "Shakti", meaning: "Divine feminine energy, cosmic power", origin: "From 'śak' meaning to be able" },
  { word: "Maya", meaning: "Illusion, the veil over true reality", origin: "From 'mā' meaning to measure or limit" },
  { word: "Ahimsa", meaning: "Non-violence, compassion to all beings", origin: "From 'a' (not) + 'hiṃsā' (harm)" },
  { word: "Namaste", meaning: "The divine in me honors the divine in you", origin: "From 'namas' (bow) + 'te' (to you)" },
  { word: "Samsara", meaning: "The cycle of death and rebirth", origin: "From 'sam' (together) + 'sṛ' (to flow)" },
  { word: "Mudra", meaning: "Symbolic hand gesture in rituals and dance", origin: "From 'mud' (delight) + 'ra' (to give)" },
];

export const EASTER_EGG_HINTS: EasterEggHint[] = [
  { hint: "Try tapping the mascot 5 times quickly... 🤫", targetScreen: 'home' },
  { hint: "Legend says a secret unlocks when you reach level 10!", targetScreen: 'profile' },
  { hint: "Some say the artifacts screen has hidden animations...", targetScreen: 'artifacts' },
  { hint: "Did you know you can shake your phone on certain screens?", targetScreen: 'games' },
  { hint: "The longest streak reveals a special message!", targetScreen: 'home' },
];

// Get today's word deterministically
export function getTodaysWordOfTheDay(): WordOfTheDay {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return WORDS_OF_THE_DAY[dayOfYear % WORDS_OF_THE_DAY.length];
}

// Get random fun fact
export function getRandomFunFact(): FunFact {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// Get random easter egg hint
export function getRandomEasterEggHint(): EasterEggHint {
  return EASTER_EGG_HINTS[Math.floor(Math.random() * EASTER_EGG_HINTS.length)];
}
