import { mutation, query } from "./_generated/server";

/**
 * Full Migration Script - ALL content from hardcoded files
 * 
 * First run: npx convex run contentMigration:clearAllContent
 * Then run each migration in order
 */

// ============================================
// CLEAR EXISTING CONTENT (Run first!)
// ============================================

export const clearAllContent = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all gameContent
    const allContent = await ctx.db.query("gameContent").collect();
    for (const item of allContent) {
      await ctx.db.delete(item._id);
    }

    // Delete all contentVersions
    const allVersions = await ctx.db.query("contentVersions").collect();
    for (const version of allVersions) {
      await ctx.db.delete(version._id);
    }

    return { success: true, message: `Cleared ${allContent.length} content items and ${allVersions.length} versions` };
  },
});

// ============================================
// WORDLE: Full 200 words
// ============================================

export const migrateWordleContent = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => q.eq("gameId", "wordle").eq("status", "active"))
      .first();

    if (existing) {
      return { success: false, message: "Wordle content exists. Run clearAllContent first." };
    }

    const WORDLE_WORDS = [
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

    let count = 0;
    for (const w of WORDLE_WORDS) {
      await ctx.db.insert("gameContent", {
        type: "wordle_word",
        gameId: "wordle",
        data: { word: w.word, hint: w.hint },
        status: "active",
        version: 1,
        tags: [],
        priority: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }

    await ctx.db.insert("contentVersions", {
      gameId: "wordle",
      version: 1,
      publishedAt: Date.now(),
      description: "Full migration",
      contentCount: count,
      checksum: "full",
    });

    return { success: true, message: `Migrated ${count} Wordle words` };
  },
});

// ============================================
// WORD FINDER: 25 word sets + 50 hard questions
// ============================================

export const migrateWordFinderContent = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => q.eq("gameId", "word-finder").eq("status", "active"))
      .first();

    if (existing) {
      return { success: false, message: "Word Finder content exists. Run clearAllContent first." };
    }

    const WORD_SETS = [
      { theme: 'Colors', words: ['BLACK', 'WHITE', 'GREEN', 'BROWN', 'CORAL'] },
      { theme: 'More Colors', words: ['BEIGE', 'IVORY', 'MAUVE', 'AMBER', 'PEACH'] },
      { theme: 'Farm Animals', words: ['HORSE', 'SHEEP', 'GOOSE', 'CHICK', 'SWINE'] },
      { theme: 'Wild Animals', words: ['TIGER', 'ZEBRA', 'PANDA', 'KOALA', 'MOOSE'] },
      { theme: 'Sea Creatures', words: ['WHALE', 'SHARK', 'SQUID', 'CORAL', 'CLAMS'] },
      { theme: 'Birds', words: ['EAGLE', 'CRANE', 'STORK', 'RAVEN', 'FINCH'] },
      { theme: 'Body Parts', words: ['HEART', 'BRAIN', 'HANDS', 'SPINE', 'LIVER'] },
      { theme: 'Face Parts', words: ['MOUTH', 'TEETH', 'CHEEK', 'BROWS', 'SKULL'] },
      { theme: 'Numbers', words: ['THREE', 'SEVEN', 'EIGHT', 'FIFTY', 'FORTY'] },
      { theme: 'Time Words', words: ['MONTH', 'YEARS', 'WEEKS', 'HOURS', 'TODAY'] },
      { theme: 'Positive Feelings', words: ['HAPPY', 'PROUD', 'BRAVE', 'CHARM', 'BLISS'] },
      { theme: 'Negative Feelings', words: ['ANGRY', 'SCARY', 'GRIEF', 'PANIC', 'SHAME'] },
      { theme: 'Weather', words: ['STORM', 'CLOUD', 'SUNNY', 'FROST', 'FOGGY'] },
      { theme: 'Plants', words: ['MAPLE', 'TULIP', 'DAISY', 'FERNS', 'GRASS'] },
      { theme: 'Landscapes', words: ['BEACH', 'CLIFF', 'RIVER', 'HILLS', 'SWAMP'] },
      { theme: 'Fruits', words: ['APPLE', 'GRAPE', 'LEMON', 'MANGO', 'PEACH'] },
      { theme: 'Vegetables', words: ['ONION', 'BEANS', 'MAIZE', 'OLIVE', 'LEEKS'] },
      { theme: 'Drinks', words: ['WATER', 'JUICE', 'LATTE', 'MOCHA', 'CIDER'] },
      { theme: 'Furniture', words: ['CHAIR', 'TABLE', 'COUCH', 'SHELF', 'STOOL'] },
      { theme: 'Kitchen Items', words: ['KNIFE', 'SPOON', 'PLATE', 'BOWLS', 'GLASS'] },
      { theme: 'Movement Verbs', words: ['CLIMB', 'DANCE', 'MARCH', 'SLIDE', 'SWING'] },
      { theme: 'Communication', words: ['SPEAK', 'WRITE', 'SHOUT', 'LAUGH', 'YELLS'] },
      { theme: 'Size Words', words: ['LARGE', 'SMALL', 'GIANT', 'DWARF', 'GRAND'] },
      { theme: 'Texture Words', words: ['ROUGH', 'SILKY', 'BUMPY', 'FUZZY', 'SLEEK'] },
      { theme: 'Speed Words', words: ['QUICK', 'RAPID', 'SWIFT', 'HASTY', 'BRISK'] },
    ];

    const HARD_QUESTIONS = [
      { question: 'What word means "extremely happy"?', answer: 'ELATED', hint: 'Feeling great joy' },
      { question: 'What word means "to make larger"?', answer: 'EXPAND', hint: 'Opposite of shrink' },
      { question: 'What word means "happening every year"?', answer: 'ANNUAL', hint: 'Once per year' },
      { question: 'What word means "easy to understand"?', answer: 'SIMPLE', hint: 'Not complex' },
      { question: 'What word means "to look quickly"?', answer: 'GLANCE', hint: 'A brief look' },
      { question: 'What word means "extremely tired"?', answer: 'WEARY', hint: 'Worn out' },
      { question: 'What word means "to persuade or influence"?', answer: 'SWAY', hint: 'Move opinion' },
      { question: 'What word means "a strong desire"?', answer: 'YEARN', hint: 'To long for' },
      { question: 'What word means "to shine brightly"?', answer: 'GLEAM', hint: 'A flash of light' },
      { question: 'What word means "brief and to the point"?', answer: 'TERSE', hint: 'Concise' },
      { question: 'What is a synonym for "begin"?', answer: 'START', hint: 'To commence' },
      { question: 'What is a synonym for "angry"?', answer: 'IRATE', hint: 'Very mad' },
      { question: 'What is a synonym for "brave"?', answer: 'BOLD', hint: 'Courageous' },
      { question: 'What is a synonym for "smart"?', answer: 'CLEVER', hint: 'Intelligent' },
      { question: 'What is a synonym for "old"?', answer: 'AGED', hint: 'Elderly' },
      { question: 'What is an antonym of "loud"?', answer: 'QUIET', hint: 'Not noisy' },
      { question: 'What is an antonym of "fast"?', answer: 'SLOW', hint: 'Not quick' },
      { question: 'What is an antonym of "heavy"?', answer: 'LIGHT', hint: 'Not heavy' },
      { question: 'What is an antonym of "rough"?', answer: 'SMOOTH', hint: 'Not bumpy' },
      { question: 'What is an antonym of "wet"?', answer: 'DRY', hint: 'Not moist' },
      { question: 'What word from Latin means "to carry"?', answer: 'FERRY', hint: 'Transport across water' },
      { question: 'What word comes from "graph" meaning write?', answer: 'DRAFT', hint: 'A written plan' },
      { question: 'What word relates to "aqua" (water)?', answer: 'FLUID', hint: 'Liquid state' },
      { question: 'What word relates to "terra"?', answer: 'EARTH', hint: 'Our planet' },
      { question: 'What word relates to "solar" (sun)?', answer: 'SUNNY', hint: 'Full of sunshine' },
      { question: 'What punctuation ends a question?', answer: 'QUERY', hint: 'Question mark symbol' },
      { question: 'What word means "to change"?', answer: 'MODIFY', hint: 'Alter or adjust' },
      { question: 'A word that shows action is called?', answer: 'VERB', hint: 'Action word' },
      { question: 'Words that name things are called?', answer: 'NOUNS', hint: 'Person, place, thing' },
      { question: 'A word that modifies a verb is called?', answer: 'ADVERB', hint: 'Quickly, slowly' },
      { question: 'In "raining cats and dogs", what does it mean?', answer: 'HEAVY', hint: 'Intense rain' },
      { question: '"Once in a blue moon" means?', answer: 'RARE', hint: 'Very seldom' },
      { question: '"Piece of cake" means something is?', answer: 'EASY', hint: 'Not difficult' },
      { question: '"Break a leg" is used to wish someone?', answer: 'LUCK', hint: 'Good fortune' },
      { question: '"Under the weather" means feeling?', answer: 'ILL', hint: 'Sick' },
      { question: 'What 5-letter word starts and ends with same letter?', answer: 'KAYAK', hint: 'Boat for paddling' },
      { question: 'What word has all 5 vowels?', answer: 'AUDIO', hint: 'Sound related' },
      { question: 'A word spelled same forwards & backwards?', answer: 'RADAR', hint: 'Detection system' },
      { question: 'What 5-letter word has no vowels?', answer: 'GLYPH', hint: 'Carved symbol' },
      { question: 'What sounds like "there" but means "belonging to them"?', answer: 'THEIR', hint: 'Possessive form' },
      { question: 'What sounds like "write" but means "correct"?', answer: 'RIGHT', hint: 'Opposite of wrong' },
      { question: 'What sounds like "flower" but means "ground grains"?', answer: 'FLOUR', hint: 'For baking' },
      { question: 'What sounds like "steel" but means "to take"?', answer: 'STEAL', hint: 'To rob' },
      { question: 'What sounds like "wait" but means "heaviness"?', answer: 'WEIGHT', hint: 'Measured in pounds' },
      { question: 'What word means "a group of birds"?', answer: 'FLOCK', hint: 'Flying together' },
      { question: 'What word means "the edge of something"?', answer: 'BRINK', hint: 'Border or verge' },
      { question: 'What word means "to look at with wide eyes"?', answer: 'STARE', hint: 'Fixed gaze' },
      { question: 'What word means "a sudden attack"?', answer: 'RAID', hint: 'Surprise assault' },
      { question: 'What word means "to avoid something"?', answer: 'EVADE', hint: 'Escape from' },
    ];

    let count = 0;

    for (const set of WORD_SETS) {
      await ctx.db.insert("gameContent", {
        type: "word_set",
        gameId: "word-finder",
        data: { theme: set.theme, words: set.words },
        status: "active",
        version: 1,
        tags: ["easy"],
        priority: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }

    for (const q of HARD_QUESTIONS) {
      await ctx.db.insert("gameContent", {
        type: "hard_question",
        gameId: "word-finder",
        data: { question: q.question, answer: q.answer, hint: q.hint },
        status: "active",
        version: 1,
        tags: ["hard"],
        priority: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }

    await ctx.db.insert("contentVersions", {
      gameId: "word-finder",
      version: 1,
      publishedAt: Date.now(),
      description: "Full migration",
      contentCount: count,
      checksum: "full",
    });

    return { success: true, message: `Migrated ${count} Word Finder items (${WORD_SETS.length} sets + ${HARD_QUESTIONS.length} questions)` };
  },
});

// ============================================
// ENGLISH INSANE: All 45 questions
// ============================================

export const migrateEnglishInsaneContent = mutation({
  args: {},
  handler: async (ctx) => {
    // Helper to generate unique codes locally within the batch
    const generateCode = (gameId: string) => {
      const prefix = gameId === 'english-insane' ? 'EI' : '';
      const num = Math.floor(100000 + Math.random() * 900000);
      return `${prefix}${num}`;
    };
    const usedCodes = new Set<string>();

    const getUniqueCode = async (gameId: string) => {
       let code = generateCode(gameId);
       let attempts = 0;
       while ((usedCodes.has(code) || (await ctx.db.query("gameContent").withIndex("by_question_code", q => q.eq("questionCode", code)).first())) && attempts < 10) {
         code = generateCode(gameId);
         attempts++;
       }
       usedCodes.add(code);
       return code;
    };

    const existing = await ctx.db
      .query("gameContent")
      .withIndex("by_game_status", (q) => q.eq("gameId", "english-insane").eq("status", "active"))
      .first();

    if (existing) {
      return { success: false, message: "English Insane content exists. Run clearAllContent first." };
    }

    const QUESTIONS = [
      // EASY
      { question: 'Which sentence is grammatically correct?', options: ['She don\'t like apples', 'She doesn\'t like apples', 'She not like apples', 'She no like apples'], correctIndex: 1, difficulty: 'easy', category: 'grammar', explanation: '"Doesn\'t" is the correct contraction of "does not" used with third-person singular subjects.' },
      { question: 'Choose the correct article: "___ apple a day keeps the doctor away."', options: ['A', 'An', 'The', 'No article needed'], correctIndex: 1, difficulty: 'easy', category: 'grammar', explanation: 'Use "an" before words that start with a vowel sound.' },
      { question: 'What is the past tense of "go"?', options: ['Goed', 'Gone', 'Went', 'Going'], correctIndex: 2, difficulty: 'easy', category: 'grammar', explanation: '"Go" is an irregular verb. Its past tense is "went".' },
      { question: 'Which word is a synonym for "happy"?', options: ['Sad', 'Joyful', 'Angry', 'Tired'], correctIndex: 1, difficulty: 'easy', category: 'vocabulary', explanation: '"Joyful" means feeling or expressing great happiness.' },
      { question: 'Complete the sentence: "Neither John ___ Mary was at the party."', options: ['or', 'and', 'nor', 'but'], correctIndex: 2, difficulty: 'easy', category: 'syntax', explanation: '"Neither...nor" is a correlative conjunction pair.' },
      { question: 'What does the idiom "break the ice" mean?', options: ['Destroy frozen water', 'Start a conversation', 'Feel cold', 'Break something'], correctIndex: 1, difficulty: 'easy', category: 'idioms', explanation: '"Break the ice" means to initiate a conversation.' },
      { question: 'Which is the correct plural of "child"?', options: ['Childs', 'Childes', 'Children', 'Childrens'], correctIndex: 2, difficulty: 'easy', category: 'grammar', explanation: '"Child" is an irregular noun. Its plural form is "children".' },
      { question: 'What is an antonym of "ancient"?', options: ['Old', 'Modern', 'Historic', 'Traditional'], correctIndex: 1, difficulty: 'easy', category: 'vocabulary', explanation: '"Modern" means relating to the present time.' },
      { question: 'Choose the correct pronoun: "Give the book to ___."', options: ['I', 'me', 'myself', 'mine'], correctIndex: 1, difficulty: 'easy', category: 'grammar', explanation: '"Me" is the objective pronoun used after prepositions.' },
      { question: 'What punctuation mark ends an interrogative sentence?', options: ['Period', 'Exclamation mark', 'Question mark', 'Comma'], correctIndex: 2, difficulty: 'easy', category: 'syntax', explanation: 'Interrogative sentences are questions, ending with a question mark.' },
      // MEDIUM
      { question: 'Which sentence uses the subjunctive mood correctly?', options: ['I wish I was taller', 'I wish I were taller', 'I wish I am taller', 'I wish I be taller'], correctIndex: 1, difficulty: 'medium', category: 'grammar', explanation: 'The subjunctive mood uses "were" for hypothetical situations.' },
      { question: 'What does "ubiquitous" mean?', options: ['Rare', 'Present everywhere', 'Unique', 'Invisible'], correctIndex: 1, difficulty: 'medium', category: 'vocabulary', explanation: '"Ubiquitous" means appearing or found everywhere; omnipresent.' },
      { question: 'Identify the dangling modifier: "Running quickly, the bus was missed."', options: ['Running quickly', 'the bus', 'was missed', 'No dangling modifier'], correctIndex: 0, difficulty: 'medium', category: 'syntax', explanation: '"Running quickly" dangles because the bus wasn\'t running.' },
      { question: 'What does "to let the cat out of the bag" mean?', options: ['Free an animal', 'Reveal a secret', 'Make a mistake', 'Start trouble'], correctIndex: 1, difficulty: 'medium', category: 'idioms', explanation: 'This idiom means to reveal a secret.' },
      { question: 'Which word is spelled correctly?', options: ['Accomodate', 'Accommodate', 'Acommodate', 'Acomodate'], correctIndex: 1, difficulty: 'medium', category: 'vocabulary', explanation: '"Accommodate" has two c\'s and two m\'s.' },
      { question: 'What is the difference between "affect" and "effect"?', options: ['They are the same', 'Affect is a noun, effect is a verb', 'Affect is a verb, effect is a noun', 'Both are verbs'], correctIndex: 2, difficulty: 'medium', category: 'grammar', explanation: '"Affect" is typically a verb, while "effect" is typically a noun.' },
      { question: 'Complete: "If I ___ you, I would apologize."', options: ['am', 'was', 'were', 'be'], correctIndex: 2, difficulty: 'medium', category: 'grammar', explanation: 'Use "were" (subjunctive) in hypothetical conditional sentences.' },
      { question: 'What is a "malapropism"?', options: ['A type of metaphor', 'Mistaken use of a similar-sounding word', 'A grammatical error', 'A figure of speech'], correctIndex: 1, difficulty: 'medium', category: 'vocabulary', explanation: 'A malapropism is the mistaken use of a word in place of a similar-sounding one.' },
      { question: 'Which sentence is in the passive voice?', options: ['The dog bit the man', 'The man was bitten by the dog', 'The dog is biting the man', 'The man will bite the dog'], correctIndex: 1, difficulty: 'medium', category: 'syntax', explanation: 'Passive voice: subject receives the action (was bitten).' },
      { question: 'What does "to burn the midnight oil" mean?', options: ['Waste resources', 'Work late into the night', 'Start a fire', 'Fail at something'], correctIndex: 1, difficulty: 'medium', category: 'idioms', explanation: 'This idiom means to work or study late into the night.' },
      { question: 'Choose the correct word: "The data ___ inconclusive."', options: ['is', 'are', 'were', 'Both A and B are acceptable'], correctIndex: 3, difficulty: 'medium', category: 'grammar', explanation: '"Data" accepts both singular and plural forms in modern usage.' },
      { question: 'What is the meaning of "cacophony"?', options: ['Beautiful music', 'Harsh, discordant sounds', 'Silence', 'Rhythmic pattern'], correctIndex: 1, difficulty: 'medium', category: 'vocabulary', explanation: '"Cacophony" means harsh, jarring sounds.' },
      { question: 'Which is correct: "Between you and ___"?', options: ['I', 'me', 'myself', 'we'], correctIndex: 1, difficulty: 'medium', category: 'grammar', explanation: '"Between" is a preposition requiring the objective case.' },
      { question: 'What literary device is "The world is a stage"?', options: ['Simile', 'Metaphor', 'Hyperbole', 'Personification'], correctIndex: 1, difficulty: 'medium', category: 'syntax', explanation: 'A metaphor directly states one thing IS another.' },
      { question: 'What does "to bite off more than you can chew" mean?', options: ['Eat too much', 'Take on too much responsibility', 'Speak rudely', 'Make excuses'], correctIndex: 1, difficulty: 'medium', category: 'idioms', explanation: 'This idiom means to take on more than you can handle.' },
      // HARD
      { question: 'Which sentence demonstrates the past perfect progressive tense?', options: ['She had been waiting for hours', 'She was waiting for hours', 'She has been waiting for hours', 'She will have been waiting'], correctIndex: 0, difficulty: 'hard', category: 'grammar', explanation: 'Past perfect progressive: had + been + verb-ing.' },
      { question: 'What is a "synecdoche"?', options: ['A type of irony', 'A figure of speech using part for whole', 'A grammatical structure', 'A punctuation rule'], correctIndex: 1, difficulty: 'hard', category: 'vocabulary', explanation: 'Synecdoche uses a part to represent the whole.' },
      { question: 'Identify the sentence with correct parallel structure:', options: ['She likes dancing, singing, and to swim', 'She likes to dance, to sing, and swimming', 'She likes dancing, singing, and swimming', 'She likes to dance, singing, and to swim'], correctIndex: 2, difficulty: 'hard', category: 'syntax', explanation: 'Parallel structure requires consistent grammatical forms.' },
      { question: 'What does "pulchritudinous" mean?', options: ['Ugly', 'Beautiful', 'Large', 'Intelligent'], correctIndex: 1, difficulty: 'hard', category: 'vocabulary', explanation: '"Pulchritudinous" means physically beautiful.' },
      { question: 'Which uses the subjunctive correctly?', options: ['The teacher insists that he studies', 'The teacher insists that he study', 'The teacher insists that he studied', 'The teacher insists that he is studying'], correctIndex: 1, difficulty: 'hard', category: 'grammar', explanation: 'After verbs of demand/suggestion, use base form subjunctive.' },
      { question: 'What does "to have a bee in one\'s bonnet" mean?', options: ['To wear a hat', 'To be obsessed with an idea', 'To be angry', 'To be confused'], correctIndex: 1, difficulty: 'hard', category: 'idioms', explanation: 'This idiom means to be preoccupied with a particular idea.' },
      { question: 'Which is a split infinitive?', options: ['To boldly go', 'To go boldly', 'Boldly to go', 'Going boldly'], correctIndex: 0, difficulty: 'hard', category: 'syntax', explanation: 'A split infinitive has a word between "to" and the verb.' },
      { question: 'What is the meaning of "obsequious"?', options: ['Rebellious', 'Excessively compliant or deferential', 'Mysterious', 'Hardworking'], correctIndex: 1, difficulty: 'hard', category: 'vocabulary', explanation: '"Obsequious" describes someone who is excessively eager to please.' },
      { question: 'Which sentence uses "whom" correctly?', options: ['Whom is calling?', 'The person whom you met is my brother', 'Whom do you think is best?', 'I know whom did it'], correctIndex: 1, difficulty: 'hard', category: 'grammar', explanation: '"Whom" is objective case. In "whom you met", "whom" is the object of "met".' },
      { question: 'What is "epistrophe" in rhetoric?', options: ['Repetition at the beginning', 'Repetition at the end', 'Opposite meanings', 'Exaggeration'], correctIndex: 1, difficulty: 'hard', category: 'syntax', explanation: 'Epistrophe: repetition at the END of clauses.' },
      { question: 'Which sentence has a misplaced modifier?', options: ['She almost drove her car for six hours', 'She drove her car for almost six hours', 'Both are correct', 'Neither is correct'], correctIndex: 0, difficulty: 'hard', category: 'syntax', explanation: '"Almost drove" implies she nearly drove but didn\'t.' },
      { question: 'What is a "gerund"?', options: ['A verb ending in -ed', 'A verb form ending in -ing used as a noun', 'A type of adjective', 'An irregular verb'], correctIndex: 1, difficulty: 'hard', category: 'grammar', explanation: 'A gerund is a verb form ending in -ing that functions as a noun.' },
      { question: 'What does "sangfroid" mean?', options: ['Hot-tempered', 'Composure under pressure', 'A type of wine', 'Sadness'], correctIndex: 1, difficulty: 'hard', category: 'vocabulary', explanation: '"Sangfroid" means composure or coolness under strain.' },
      { question: 'What is the difference between "who" and "that" for people?', options: ['They are always interchangeable', '"Who" is preferred for people; "that" for things', '"That" is preferred for people', 'There is no difference'], correctIndex: 1, difficulty: 'hard', category: 'grammar', explanation: '"Who" is preferred when referring to people.' },
      { question: 'What does "to throw in the towel" originate from?', options: ['Cleaning', 'Boxing', 'Swimming', 'Cooking'], correctIndex: 1, difficulty: 'hard', category: 'idioms', explanation: 'This idiom comes from boxing, where a trainer throws a towel to concede defeat.' },
    ];

    let count = 0;
    for (const q of QUESTIONS) {
      await ctx.db.insert("gameContent", {
        type: "gk_question",
        gameId: "english-insane",
        data: {
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: q.difficulty,
          category: q.category,
          explanation: q.explanation,
        },
        status: "active",
        version: 1,
        tags: [q.difficulty, q.category],
        priority: 0,
        questionCode: await getUniqueCode("english-insane"),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }

    await ctx.db.insert("contentVersions", {
      gameId: "english-insane",
      version: 1,
      publishedAt: Date.now(),
      description: "Full migration",
      contentCount: count,
      checksum: "full",
    });

    return { success: true, message: `Migrated ${count} English Insane questions` };
  },
});

// ============================================
// MIGRATION STATUS
// ============================================

export const getMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const wordleCount = (await ctx.db.query("gameContent").withIndex("by_game_status", (q) => q.eq("gameId", "wordle").eq("status", "active")).collect()).length;
    const wordFinderCount = (await ctx.db.query("gameContent").withIndex("by_game_status", (q) => q.eq("gameId", "word-finder").eq("status", "active")).collect()).length;
    const englishInsaneCount = (await ctx.db.query("gameContent").withIndex("by_game_status", (q) => q.eq("gameId", "english-insane").eq("status", "active")).collect()).length;

    return {
      wordle: { migrated: wordleCount > 0, count: wordleCount },
      wordFinder: { migrated: wordFinderCount > 0, count: wordFinderCount },
      englishInsane: { migrated: englishInsaneCount > 0, count: englishInsaneCount },
    };
  },
});

// ============================================
// BACKFILL UTILS
// ============================================

export const backfillQuestionCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const allContent = await ctx.db.query("gameContent").collect();
    let updatedCount = 0;

    const generateCode = (gameId: string) => {
      const prefix = gameId === 'english-insane' ? 'EI' : '';
      const num = Math.floor(100000 + Math.random() * 900000);
      return `${prefix}${num}`;
    };

    for (const item of allContent) {
      const isEnglishInsane = item.gameId === 'english-insane';
      const hasCorrectFormat = item.questionCode && (isEnglishInsane ? item.questionCode.startsWith('EI') : true);

      if (!item.questionCode || !hasCorrectFormat) {
        let code = generateCode(item.gameId);
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
          const existing = await ctx.db
            .query("gameContent")
            .withIndex("by_question_code", (q: any) => q.eq("questionCode", code))
            .first();
          
          if (!existing) {
            isUnique = true;
          } else {
            code = generateCode(item.gameId);
            attempts++;
          }
        }

        if (isUnique) {
          await ctx.db.patch(item._id, { questionCode: code });
          updatedCount++;
        }
      }
    }

    return { success: true, message: `Backfilled ${updatedCount} items with question codes` };
  },
});
