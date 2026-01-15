// 5-letter English words for Wordle with hints
// Common vocabulary words with hint clues for each

export interface WordleWordData {
  word: string;
  hint: string;
}

export const WORDLE_WORDS: WordleWordData[] = [
  // Common Everyday Words
  { word: 'ABOUT', hint: 'Concerning or regarding something' },
  { word: 'ABOVE', hint: 'Higher in position than' },
  { word: 'ACTOR', hint: 'Someone who performs in movies or plays' },
  { word: 'ADAPT', hint: 'To adjust to new conditions' },
  { word: 'ADMIT', hint: 'To confess or allow entry' },
  { word: 'ADOPT', hint: 'To take as one\'s own' },
  { word: 'ADULT', hint: 'A fully grown person' },
  { word: 'AGENT', hint: 'A person who acts on behalf of another' },
  { word: 'AGREE', hint: 'To have the same opinion' },
  { word: 'AHEAD', hint: 'In front or forward' },
  { word: 'ALARM', hint: 'A warning sound or device' },
  { word: 'ALBUM', hint: 'A collection of songs or photos' },
  { word: 'ALERT', hint: 'Quick to notice or watchful' },
  { word: 'ALLOW', hint: 'To permit or let happen' },
  { word: 'ALONE', hint: 'Without anyone else' },
  { word: 'ALONG', hint: 'Moving in a constant direction' },
  { word: 'ALTER', hint: 'To change or modify' },
  { word: 'AMONG', hint: 'In the middle of a group' },
  { word: 'ANGER', hint: 'A strong feeling of displeasure' },
  { word: 'ANGLE', hint: 'The space between two lines that meet' },

  // Action Words
  { word: 'ANGRY', hint: 'Feeling strong displeasure' },
  { word: 'APART', hint: 'Separated by distance' },
  { word: 'APPLE', hint: 'A common red or green fruit' },
  { word: 'APPLY', hint: 'To make a request or put into action' },
  { word: 'ARENA', hint: 'A venue for sports or entertainment' },
  { word: 'ARGUE', hint: 'To exchange opposing views' },
  { word: 'ARISE', hint: 'To get up or come into being' },
  { word: 'AVOID', hint: 'To keep away from' },
  { word: 'AWAKE', hint: 'Not sleeping' },
  { word: 'AWARD', hint: 'A prize given for achievement' },
  { word: 'BEACH', hint: 'Sandy shore by the ocean' },
  { word: 'BEGIN', hint: 'To start something' },
  { word: 'BEING', hint: 'Existence or a living creature' },
  { word: 'BELOW', hint: 'Under or lower than' },
  { word: 'BENCH', hint: 'A long seat for multiple people' },
  { word: 'BIRTH', hint: 'The beginning of life' },
  { word: 'BLACK', hint: 'The darkest color' },
  { word: 'BLAME', hint: 'To hold responsible for a fault' },
  { word: 'BLANK', hint: 'Empty or not written on' },
  { word: 'BLEND', hint: 'To mix together smoothly' },

  // Descriptive Words
  { word: 'BLIND', hint: 'Unable to see' },
  { word: 'BLOCK', hint: 'A solid piece or to obstruct' },
  { word: 'BLOOD', hint: 'Red fluid in our bodies' },
  { word: 'BOARD', hint: 'A flat piece of wood or a committee' },
  { word: 'BOOST', hint: 'To increase or push up' },
  { word: 'BOUND', hint: 'Headed somewhere or tied' },
  { word: 'BRAIN', hint: 'The organ for thinking' },
  { word: 'BRAND', hint: 'A company\'s name or mark' },
  { word: 'BRAVE', hint: 'Showing courage' },
  { word: 'BREAD', hint: 'A baked food from flour' },
  { word: 'BREAK', hint: 'To shatter or a pause' },
  { word: 'BRICK', hint: 'A rectangular building block' },
  { word: 'BRIEF', hint: 'Short in duration' },
  { word: 'BRING', hint: 'To carry toward' },
  { word: 'BROAD', hint: 'Wide or general' },
  { word: 'BROWN', hint: 'Color of chocolate' },
  { word: 'BUILD', hint: 'To construct or create' },
  { word: 'BUNCH', hint: 'A group of things together' },
  { word: 'BURST', hint: 'To break open suddenly' },
  { word: 'CABLE', hint: 'A thick wire or rope' },

  // Places & Objects
  { word: 'CARRY', hint: 'To transport something' },
  { word: 'CATCH', hint: 'To grab something moving' },
  { word: 'CAUSE', hint: 'A reason or to make happen' },
  { word: 'CHAIN', hint: 'Connected metal links' },
  { word: 'CHAIR', hint: 'A seat with a back' },
  { word: 'CHEAP', hint: 'Low in price' },
  { word: 'CHECK', hint: 'To verify or a pattern' },
  { word: 'CHEST', hint: 'Upper body or storage box' },
  { word: 'CHIEF', hint: 'The leader or main' },
  { word: 'CHILD', hint: 'A young person' },
  { word: 'CHOSE', hint: 'Past tense of choose' },
  { word: 'CLAIM', hint: 'To state as true or demand' },
  { word: 'CLASS', hint: 'A group of students or category' },
  { word: 'CLEAN', hint: 'Free from dirt' },
  { word: 'CLEAR', hint: 'Easy to see through or understand' },
  { word: 'CLIMB', hint: 'To go up using hands and feet' },
  { word: 'CLOCK', hint: 'Device that shows time' },
  { word: 'CLOSE', hint: 'Near or to shut' },
  { word: 'CLOUD', hint: 'White fluffy thing in sky' },
  { word: 'COACH', hint: 'A trainer or bus' },

  // More Common Words
  { word: 'COAST', hint: 'Land near the sea' },
  { word: 'COUNT', hint: 'To number things' },
  { word: 'COURT', hint: 'A place for justice or sports' },
  { word: 'COVER', hint: 'To place something over' },
  { word: 'CRAFT', hint: 'A skill or handmade item' },
  { word: 'CRASH', hint: 'A violent collision' },
  { word: 'CREAM', hint: 'Thick white dairy product' },
  { word: 'CRIME', hint: 'An illegal act' },
  { word: 'CROSS', hint: 'To go from one side to another' },
  { word: 'CROWD', hint: 'A large group of people' },
  { word: 'DAILY', hint: 'Happening every day' },
  { word: 'DANCE', hint: 'Moving rhythmically to music' },
  { word: 'DEATH', hint: 'The end of life' },
  { word: 'DEBUT', hint: 'A first appearance' },
  { word: 'DELAY', hint: 'To make late or postpone' },
  { word: 'DEPTH', hint: 'How deep something is' },
  { word: 'DOING', hint: 'Performing an action' },
  { word: 'DOUBT', hint: 'Feeling uncertain' },
  { word: 'DOZEN', hint: 'A group of twelve' },
  { word: 'DRAFT', hint: 'A rough version or wind' },

  // Emotions & States
  { word: 'DRAMA', hint: 'A play or emotional situation' },
  { word: 'DRANK', hint: 'Past tense of drink' },
  { word: 'DRAWN', hint: 'Past participle of draw' },
  { word: 'DREAM', hint: 'Images during sleep or a hope' },
  { word: 'DRESS', hint: 'A woman\'s garment or to clothe' },
  { word: 'DRINK', hint: 'To swallow liquid' },
  { word: 'DRIVE', hint: 'To operate a vehicle' },
  { word: 'DROVE', hint: 'Past tense of drive' },
  { word: 'DYING', hint: 'In the process of death' },
  { word: 'EAGER', hint: 'Very enthusiastic' },

  // Things
  { word: 'EARLY', hint: 'Before the expected time' },
  { word: 'EARTH', hint: 'Our planet' },
  { word: 'EIGHT', hint: 'Number after seven' },
  { word: 'ELITE', hint: 'The best of a group' },
  { word: 'EMPTY', hint: 'Containing nothing' },
  { word: 'ENEMY', hint: 'One who opposes you' },
  { word: 'ENJOY', hint: 'To take pleasure in' },
  { word: 'ENTER', hint: 'To go into' },
  { word: 'ENTRY', hint: 'An act of entering or an item' },
  { word: 'EQUAL', hint: 'The same in value or amount' },
  { word: 'ERROR', hint: 'A mistake' },
  { word: 'EVENT', hint: 'Something that happens' },
  { word: 'EVERY', hint: 'All without exception' },
  { word: 'EXACT', hint: 'Precisely accurate' },
  { word: 'EXIST', hint: 'To be real or live' },
  { word: 'EXTRA', hint: 'More than usual' },
  { word: 'FAITH', hint: 'Complete trust or belief' },
  { word: 'FALSE', hint: 'Not true' },
  { word: 'FAULT', hint: 'A mistake or defect' },
  { word: 'FAVOR', hint: 'An act of kindness' },

  // More Words
  { word: 'FIELD', hint: 'An open area of land' },
  { word: 'FIFTH', hint: 'Position number 5' },
  { word: 'FIFTY', hint: 'The number 50' },
  { word: 'FIGHT', hint: 'A physical struggle' },
  { word: 'FINAL', hint: 'The last one' },
  { word: 'FIRST', hint: 'Before all others' },
  { word: 'FIXED', hint: 'Repaired or not moving' },
  { word: 'FLASH', hint: 'A brief burst of light' },
  { word: 'FLEET', hint: 'A group of ships' },
  { word: 'FLOOR', hint: 'The bottom surface of a room' },
  { word: 'FLUID', hint: 'A liquid substance' },
  { word: 'FOCUS', hint: 'Center of attention or clarity' },
  { word: 'FORCE', hint: 'Power or to compel' },
  { word: 'FORTH', hint: 'Forward or onward' },
  { word: 'FORTY', hint: 'The number 40' },
  { word: 'FORUM', hint: 'A place for discussion' },
  { word: 'FOUND', hint: 'Discovered or established' },
  { word: 'FRAME', hint: 'A border or structure' },
  { word: 'FRESH', hint: 'Recently made or not stale' },
  { word: 'FRONT', hint: 'The forward part' },
  { word: 'FRUIT', hint: 'Sweet food from plants' },
  { word: 'FUNNY', hint: 'Causing laughter' },
  { word: 'GIANT', hint: 'Extremely large' },
  { word: 'GIVEN', hint: 'Provided or specified' },
  { word: 'GLASS', hint: 'Transparent material' },
  { word: 'GLOBE', hint: 'A sphere, especially Earth' },
  { word: 'GOING', hint: 'Moving from one place to another' },
  { word: 'GRACE', hint: 'Elegance or divine favor' },
  { word: 'GRADE', hint: 'A level or mark' },
  { word: 'GRAIN', hint: 'A cereal seed' },
  { word: 'GRAND', hint: 'Impressive or magnificent' },
  { word: 'GRANT', hint: 'To give or allow' },
  { word: 'GRASS', hint: 'Green plants on lawns' },
  { word: 'GRAVE', hint: 'A burial place' },
  { word: 'GREAT', hint: 'Of large size or excellent' },
  { word: 'GREEN', hint: 'Color of grass' },
  { word: 'GROSS', hint: 'Total before deductions or disgusting' },
  { word: 'GROUP', hint: 'A collection of people or things' },
  { word: 'GROWN', hint: 'Fully developed' },
  { word: 'GUESS', hint: 'An estimate without knowledge' },
  { word: 'GUEST', hint: 'A visitor' },
  { word: 'GUIDE', hint: 'One who shows the way' },
  { word: 'HAPPY', hint: 'Feeling joy' },
  { word: 'HEART', hint: 'The organ that pumps blood' },
  { word: 'HEAVY', hint: 'Having great weight' },
  { word: 'HENCE', hint: 'For this reason' },
  { word: 'HORSE', hint: 'A large animal for riding' },
  { word: 'HOTEL', hint: 'A place to stay when traveling' },
  { word: 'HOUSE', hint: 'A building where people live' },
  { word: 'HUMAN', hint: 'A person' },
  { word: 'IDEAL', hint: 'Perfect or a standard' },
  { word: 'IMAGE', hint: 'A picture or representation' },
  { word: 'INDEX', hint: 'A list or pointer' },
  { word: 'INNER', hint: 'Inside or interior' },
  { word: 'INPUT', hint: 'Data entered into a system' },
];

// Import comprehensive word list (14,855 valid 5-letter words)
import validWordList from '../assets/possible_wordle_words.json';

// Create Set once at module load for O(1) lookups
// Words are already uppercase in the JSON
export const VALID_WORDS: Set<string> = new Set(validWordList);

// Function to get today's word data deterministically (using IST timezone)
export function getTodaysWordData(): WordleWordData {
  const startDate = new Date('2024-01-01').getTime();
  // Use IST (UTC+5:30) for consistent word across all users
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const today = new Date(istNow.toISOString().split('T')[0]).getTime();
  const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return WORDLE_WORDS[daysSinceStart % WORDLE_WORDS.length];
}

// Function to get today's word (backward compatible)
export function getTodaysWord(): string {
  return getTodaysWordData().word;
}

// Function to get today's hint
export function getTodaysHint(): string {
  return getTodaysWordData().hint;
}

// Check if a word is valid for guessing (case-insensitive)
export function isValidWord(word: string): boolean {
  return VALID_WORDS.has(word.toUpperCase());
}
