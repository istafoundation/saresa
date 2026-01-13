// 5-letter mythology-themed words for Wordle
// Each word relates to Hindu mythology, culture, or Sanskrit terms

export const WORDLE_WORDS = [
  // Gods and Deities
  'SHIVA', 'DURGA', 'INDRA', 'AGNIS', 'SURYA',
  'VARUN', 'KUBERA', 'YAMAS', 'KALIS', 'SHAKTI',
  
  // Concepts and Terms
  'KARMA', 'VEDAS', 'PRANA', 'ATMAN', 'MUDRA',
  'YANTRA', 'TANTRA', 'SUTRA', 'MANAS', 'YOGIS',
  
  // Epic Characters
  'RAMAS', 'SITAS', 'ARJUN', 'BHIMA', 'DRONA',
  'KARNA', 'NAKUL', 'KRIPA',
  
  // Sacred Items
  'LOTUS', 'CONCH', 'FLASK', 'WHEEL', 'MACES',
  
  // Places
  'KASHI', 'GANGA', 'AYODH', 'LANKA', 'MATHS',
  
  // Animals (Vahanas)
  'NANDI', 'GARUD', 'SWANS', 'LIONS', 'BULLS',
  
  // Nature Elements  
  'EARTH', 'FIRES', 'WATER', 'WINDS', 'SKIES',
  
  // Qualities
  'POWER', 'GRACE', 'TRUTH', 'PEACE', 'LIGHT',
  'VALOR', 'GLORY', 'HONOR', 'UNITY', 'BLISS',
  
  // Actions
  'DANCE', 'CHANT', 'BLESS', 'GUARD', 'GUIDE',
  
  // Time/Cycle
  'YUGAS', 'CYCLE', 'EPOCH', 'TIMES', 'KALPA',
  
  // Weapons (simplified)
  'SWORD', 'ARROW', 'SPEAR', 'BLAZE', 'STORM',
  
  // Music/Arts
  'FLUTE', 'DRUMS', 'VEENA', 'SONGS', 'BEATS',
  
  // Numbers/Sacred
  'THREE', 'SEVEN', 'THREI', 'TRINE',
  
  // Common Sanskrit-derived
  'NAMES', 'FORMS', 'PATHS', 'SOULS', 'STARS',
  'REALM', 'CROWN', 'ROYAL', 'SAGE',
];

// Total valid words for checking guesses
// In a real app, we'd have a comprehensive dictionary
export const VALID_WORDS = new Set([
  ...WORDLE_WORDS,
  // Common 5-letter English words for valid guesses
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
  'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE',
  'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'APART',
  'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'ARRAY', 'ASIDE', 'ASSET', 'AUDIO',
  'AVOID', 'AWARD', 'AWARE', 'BASIC', 'BASIS', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW',
  'BENCH', 'BIBLE', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLIND',
  'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOUND', 'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK',
  'BREED', 'BRICK', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUNCH', 'BURST',
  'BUYER', 'CABIN', 'CABLE', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHEAP', 'CHECK',
  'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR',
  'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER',
  'CRAFT', 'CRASH', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'DAILY', 'DATED', 'DEALT', 'DEATH',
  'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA', 'DRANK', 'DRAWN',
  'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EIGHT', 'ELITE',
  'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
  'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FAVOR', 'FENCE', 'FEWER', 'FIBER', 'FIELD',
  'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLESH', 'FLOAT',
  'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK',
  'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE',
  'GOING', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRASS', 'GRAVE', 'GREAT', 'GREEN',
  'GROSS', 'GROUP', 'GROWN', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HEART', 'HEAVY', 'HENCE',
  'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE',
  'JOINT', 'JONES', 'JUDGE', 'JUICE', 'KNIFE', 'KNOCK', 'KNOWN', 'LABEL', 'LABOR', 'LARGE',
  'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL',
  'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVED', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY',
  'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE', 'MAYOR',
  'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH',
  'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY',
  'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN',
  'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNED', 'OWNER', 'PANEL', 'PAPER', 'PARTY', 'PATCH',
  'PAUSE', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN',
  'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE',
  'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET',
  'QUITE', 'QUOTE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER',
  'RELAX', 'REPLY', 'RIGHT', 'RIVAL', 'RIVER', 'ROBOT', 'ROCKY', 'ROMAN', 'ROUGH', 'ROUND',
  'ROUTE', 'ROYAL', 'RURAL', 'SALES', 'SAVED', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE',
  'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT',
  'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SILLY', 'SIMON', 'SINCE', 'SIXTH',
  'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE',
  'SNAKE', 'SNOW', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK',
  'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND',
  'START', 'STATE', 'STEAM', 'STEEL', 'STEEP', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD',
  'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE',
  'SUPER', 'SWEET', 'SWING', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEETH', 'TERMS',
  'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK',
  'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMER', 'TITLE', 'TODAY', 'TOKEN',
  'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TRASH',
  'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUST',
  'TRUTH', 'TWICE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE',
  'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE',
  'WATCH', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WORLD',
  'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD',
  'YOUNG', 'YOUTH', 'ZEROS',
]);

// Function to get today's word deterministically
export function getTodaysWord(): string {
  const startDate = new Date('2024-01-01').getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return WORDLE_WORDS[daysSinceStart % WORDLE_WORDS.length];
}

// Check if a word is valid for guessing
export function isValidWord(word: string): boolean {
  return VALID_WORDS.has(word.toUpperCase());
}
