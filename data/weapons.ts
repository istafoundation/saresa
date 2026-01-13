// Hindu Mythology Weapons - Card collectibles with rarity system
// Users unlock weapon cards randomly, each with a backstory

export type Rarity = 'common' | 'rare' | 'epic';

export interface Weapon {
  id: string;
  name: string;
  owner: string;
  rarity: Rarity;
  icon: string;
  shortDescription: string;
  backstory: string;
  power: string;
}

// Rarity drop rates
export const RARITY_CHANCES = {
  common: 0.70,   // 70%
  rare: 0.25,     // 25%
  epic: 0.05,     // 5%
};

export const WEAPONS: Weapon[] = [
  // EPIC WEAPONS (5% drop rate)
  {
    id: 'pashupatastra',
    name: 'Pashupatastra',
    owner: 'Lord Shiva → Arjuna',
    rarity: 'epic',
    icon: '💀',
    shortDescription: 'The weapon of total annihilation',
    backstory: `The Pashupatastra is the most destructive weapon in existence, capable of destroying creation itself. Lord Shiva revealed this weapon to Arjuna after a legendary encounter.

Arjuna was performing severe penance in the Himalayas. Shiva, wanting to test him, appeared as a tribal hunter and they fought over a slain boar. Arjuna fought valiantly, impressing Shiva.

Revealing his true form, Shiva granted Arjuna the Pashupatastra - a weapon so powerful that its mere invocation could destroy the three worlds. Arjuna never used it in the Mahabharata war, knowing its catastrophic potential.`,
    power: 'Can destroy the three worlds; no defense exists against it',
  },
  {
    id: 'brahmastra',
    name: 'Brahmastra',
    owner: 'Lord Brahma → Many warriors',
    rarity: 'epic',
    icon: '✨',
    shortDescription: 'The ultimate divine missile',
    backstory: `Created by Lord Brahma, the Brahmastra is a divine weapon that never misses its target. It can be invoked by a secret mantra and fired using any object - even a blade of grass.

The weapon seeks and follows its target relentlessly. When two Brahmastras collide, the resulting devastation can destroy entire regions.

In the Mahabharata, Ashwatthama infamously fired a Brahmastra at the womb of Uttara to destroy the Pandava lineage. Krishna intervened, saving the unborn Parikshit, and cursed Ashwatthama to wander eternally with a festering wound.

The Brahmastra represents the ultimate responsibility of power - to be used only when all other options fail.`,
    power: 'Never misses; causes devastation equal to nuclear weapons',
  },
  {
    id: 'sudarshana',
    name: 'Sudarshana Chakra',
    owner: 'Lord Vishnu',
    rarity: 'epic',
    icon: '☸️',
    shortDescription: 'The spinning discus of preservation',
    backstory: `The Sudarshana Chakra has 108 serrated edges and spins with the brilliance of a thousand suns. It represents the wheel of time and universal order.

Lord Krishna used this weapon multiple times. The most famous instance was at the swayamvara of Rukmini, where Krishna rescued her from an unwanted marriage.

The Chakra once attempted to attack Durvasa, a quick-tempered sage who had cursed Ambarisha, a devoted king. When the Chakra chased Durvasa across the universe, even Brahma and Shiva couldn't protect him. Only Ambarisha's forgiveness stopped it - showing that the Chakra obeys dharma above all.`,
    power: 'Travels anywhere in creation; unerringly destroys evil; always returns to Vishnu',
  },
  {
    id: 'trishula',
    name: 'Trishula',
    owner: 'Lord Shiva',
    rarity: 'epic',
    icon: '🔱',
    shortDescription: 'The trident of the destroyer',
    backstory: `Shiva's Trishula represents his absolute power over the three worlds, three times, and three aspects of existence.

With this trident, Shiva destroyed the Tripura - three demonic flying cities that could only be destroyed when aligned once in a thousand years. Using the Meru mountain as a bow and Vishnu as the arrow, Shiva waited for the precise celestial moment and destroyed all three with a single strike.

The Trishula also severed Brahma's fifth head when Brahma became arrogant. This act established Shiva's role as the ultimate judge of cosmic order.`,
    power: 'Destroys anything; represents control over creation, preservation, destruction',
  },

  // RARE WEAPONS (25% drop rate)
  {
    id: 'gandiva',
    name: 'Gandiva',
    owner: 'Arjuna',
    rarity: 'rare',
    icon: '🏹',
    shortDescription: 'The celestial bow of the greatest archer',
    backstory: `Created by Brahma and passed through Soma, Varuna, and finally to Arjuna, Gandiva was the most famous bow in the epics.

Made of celestial wood, it stood as tall as a palm tree and produced thunder when drawn. Its string could never break, and it came with two inexhaustible quivers.

During the burning of the Khandava forest, Arjuna created such a dense canopy of arrows that not a single drop of Indra's rain could pass through. After the Mahabharata war, Arjuna returned Gandiva to the sea.`,
    power: 'Produces thunder; inexhaustible arrows; impossible accuracy',
  },
  {
    id: 'vajra',
    name: 'Vajra',
    owner: 'Lord Indra',
    rarity: 'rare',
    icon: '⚡',
    shortDescription: 'The thunderbolt of the king of gods',
    backstory: `The Vajra was created from the bones of the sage Dadhichi, who sacrificed his life so the gods could forge a weapon against the demon Vritra.

Vritra had swallowed all the world's water, causing devastating drought. Armed with the Vajra, Indra split Vritra open, releasing the waters and saving creation.

The Vajra represents indestructible truth - it is often compared to the diamond ('vajra' also means diamond in Sanskrit). Like a diamond that cuts everything but cannot be cut, the Vajra breaks all obstacles while remaining unbreakable.`,
    power: 'Unbreakable; produces devastating lightning; can split mountains',
  },
  {
    id: 'vijaya',
    name: 'Vijaya Bow',
    owner: 'Karna → Arjuna',
    rarity: 'rare',
    icon: '🎯',
    shortDescription: 'The bow that guarantees victory',
    backstory: `The Vijaya bow was created by Vishwakarma for Lord Shiva. It was later wielded by Parashurama, who gave it to his student Karna.

With Vijaya, Karna was virtually undefeatable. The bow guaranteed victory to its wielder. During the Kurukshetra war, Karna's archery with Vijaya matched and sometimes exceeded even Arjuna with Gandiva.

Tragically, when Karna's chariot wheel got stuck and he invoked warrior's code asking for time, Arjuna killed him. The Vijaya bow then passed to Arjuna, though some say its power waned with Karna's noble death.`,
    power: 'Guarantees victory; rivals the Gandiva in power',
  },
  {
    id: 'pinaka',
    name: 'Pinaka',
    owner: 'Lord Shiva',
    rarity: 'rare',
    icon: '🌙',
    shortDescription: 'The bow that won Sita',
    backstory: `Pinaka was the divine bow of Lord Shiva, kept in King Janaka's court as a test for Sita's suitors. Hundreds of princes couldn't even lift it.

When young Rama strung the bow, it didn't just bend - it snapped with such force that the sound was heard across kingdoms! This feat won him Sita's hand in marriage.

The broken Pinaka represents that even the mightiest instruments fulfill their purpose and make way for new beginnings. The sound of its breaking announced the start of one of history's greatest love stories.`,
    power: 'Immense weight; stringing it proved divine strength',
  },
  {
    id: 'sharanga',
    name: 'Sharanga',
    owner: 'Lord Vishnu → Rama',
    rarity: 'rare',
    icon: '🌊',
    shortDescription: 'The bow of the preserver',
    backstory: `Sharanga is Lord Vishnu's personal bow, made of divine horn. When Vishnu incarnated as Rama, Sharanga manifested in the mortal world.

After Rama broke Shiva's Pinaka, Parashurama challenged him, offended that a young prince had broken his guru's bow. He offered Rama the Sharanga to string.

Rama not only strung it effortlessly but nocked an arrow at Parashurama, proving he was Vishnu incarnate. Parashurama, recognizing the divine truth, bowed and retired to the mountains. This established Rama's divinity beyond doubt.`,
    power: 'Vishnu\'s personal weapon; confirms the wielder as an avatar',
  },
  {
    id: 'narayanastra',
    name: 'Narayanastra',
    owner: 'Lord Vishnu → Ashwatthama',
    rarity: 'rare',
    icon: '🔥',
    shortDescription: 'The weapon that grows stronger with resistance',
    backstory: `The Narayanastra was Vishnu's personal weapon, one that could only be used once per incarnation. Ashwatthama possessed it in the Mahabharata.

When deployed against the Pandava army, it rained millions of deadly missiles that multiplied the harder one fought back. Resistance was futile - the more you resisted, the stronger it became!

Krishna knew the only counter: complete surrender. He made the Pandava army lay down their weapons and bow in submission. The Narayanastra, receiving no resistance, dissipated harmlessly.

This teaches a profound truth - sometimes the only way to overcome overwhelming force is not through resistance, but through surrender to the divine.`,
    power: 'Intensifies with resistance; can only be neutralized by complete surrender',
  },

  // COMMON WEAPONS (70% drop rate)
  {
    id: 'khadga',
    name: 'Khadga',
    owner: 'Various warriors',
    rarity: 'common',
    icon: '⚔️',
    shortDescription: 'The divine sword',
    backstory: `The Khadga is the sacred sword, representing discriminative wisdom that cuts through illusion. Many warriors in the epics wielded divine swords.

Nakula and Sahadeva were expert swordsmen among the Pandavas. In the final mace duel, after Bhima broke Duryodhana's thighs, it was the sword that represented justice served.

The sword in Hindu tradition represents the cutting of ego and attachment - the sharp edge of wisdom that separates truth from falsehood.`,
    power: 'Symbol of justice and discriminative wisdom',
  },
  {
    id: 'gada',
    name: 'Gada (Mace)',
    owner: 'Bhima, Hanuman, Vishnu',
    rarity: 'common',
    icon: '🪨',
    shortDescription: 'The weapon of raw strength',
    backstory: `The mace represents pure physical power. Bhima was the greatest mace wielder among mortals, having been trained by Balarama, Krishna's elder brother.

Vishnu's mace is called Kaumodaki, which means "that which captivates the mind." It represents the power that subdues demonic forces.

Bhima's legendary mace duel with Duryodhana on the last day of the Kurukshetra war decided the outcome. Though Duryodhana was technically more skilled, Bhima's raw power and righteous anger prevailed.`,
    power: 'Crushing force; requires immense strength to wield effectively',
  },
  {
    id: 'chakram',
    name: 'Chakram',
    owner: 'Various warriors',
    rarity: 'common',
    icon: '⭕',
    shortDescription: 'The throwing discus',
    backstory: `The Chakram is a circular throwing blade, different from Vishnu's Sudarshana in that mortals could wield it.

Warriors would spin the chakram on their fingers before throwing, giving it immense rotational speed. Skilled wielders could control its trajectory mid-flight.

In south Indian traditions, the chakram became especially popular as a weapon of precision warfare, capable of cutting through armor from a distance.`,
    power: 'Precise ranged weapon; can be thrown and retrieved',
  },
  {
    id: 'parshu',
    name: 'Parshu (Axe)',
    owner: 'Parashurama',
    rarity: 'common',
    icon: '🪓',
    shortDescription: 'The axe of the warrior sage',
    backstory: `Parashurama received his divine axe (parshu) from Lord Shiva after performing intense penance. This axe gave him his very name - Parashu-Rama (Rama with the axe).

With this weapon, Parashurama famously traveled around the world 21 times, defeating the corrupt Kshatriya warriors who had strayed from dharma.

Despite being a Brahmin, Parashurama became the greatest warrior of his era, teaching both Bhishma and Karna in archery. His axe represents the cutting away of corruption and injustice.`,
    power: 'Never dulls; symbolizes destruction of adharma',
  },
  {
    id: 'shankha',
    name: 'Panchajanya',
    owner: 'Lord Krishna',
    rarity: 'common',
    icon: '🐚',
    shortDescription: 'The divine conch shell',
    backstory: `Panchajanya was Krishna's conch shell, obtained after he killed the demon Panchajana who lived inside a giant conch in the ocean.

Before the Kurukshetra war began, Krishna blew Panchajanya, producing a sound that reverberated across all realms. This sound struck fear in the Kaurava army.

Each Pandava had their own conch with distinct sounds. The blowing of these conches at the war's beginning is described in the opening of the Bhagavad Gita - marking the point of no return.`,
    power: 'Sound terrorizes the unrighteous; announces divine presence',
  },
  {
    id: 'dhanush',
    name: 'Common Bow',
    owner: 'All archers',
    rarity: 'common',
    icon: '🎯',
    shortDescription: 'The warrior\'s trusted companion',
    backstory: `The bow (dhanush) is the most common weapon in Hindu epics. Archery (dhanurveda) was considered the supreme martial art.

From common soldiers to kings, all warriors trained extensively in archery. The bow represented control, discipline, and precision - qualities every warrior aspired to.

A warrior's relationship with their bow was sacred. Before battle, the bow would be honored with mantras. The sound of arrow release was considered auspicious, and skilled archers could identify other warriors by the sound of their bowstrings alone.`,
    power: 'Ranges from basic to legendary in power depending on wielder',
  },
  {
    id: 'asi',
    name: 'Asi (Short Sword)',
    owner: 'Various warriors',
    rarity: 'common',
    icon: '🗡️',
    shortDescription: 'The close combat blade',
    backstory: `The Asi is a short sword or dagger used in close combat when longer weapons became impractical.

In grappling situations or when fighting in confined spaces, warriors would draw their Asi. It was also essential for cutting ropes, clearing paths, and emergency situations.

Every warrior carried an Asi as backup. The weapon represented preparedness and adaptability - key warrior virtues.`,
    power: 'Essential backup weapon; quick and maneuverable',
  },
  {
    id: 'tomara',
    name: 'Tomara (Iron Javelin)',
    owner: 'Cavalry warriors',
    rarity: 'common',
    icon: '🎣',
    shortDescription: 'The throwing spear',
    backstory: `The Tomara was a heavy iron javelin used especially by cavalry. Warriors would throw these from horseback with devastating effect.

Made of solid iron with a sharp pointed head, the Tomara could pierce armor and shields. Skilled warriors carried multiple javelins and could throw them in rapid succession.

In formation warfare, a rain of Tomaras from cavalry could break enemy infantry lines, creating openings for chariot charges.`,
    power: 'Armor-piercing; effective ranged cavalry weapon',
  },
];

// Get weapons by rarity
export function getWeaponsByRarity(rarity: Rarity): Weapon[] {
  return WEAPONS.filter(w => w.rarity === rarity);
}

// Get random weapon based on rarity chances
export function getRandomWeapon(): Weapon {
  const roll = Math.random();
  
  let rarity: Rarity;
  if (roll < RARITY_CHANCES.epic) {
    rarity = 'epic';
  } else if (roll < RARITY_CHANCES.epic + RARITY_CHANCES.rare) {
    rarity = 'rare';
  } else {
    rarity = 'common';
  }
  
  const weaponsOfRarity = getWeaponsByRarity(rarity);
  return weaponsOfRarity[Math.floor(Math.random() * weaponsOfRarity.length)];
}

// Get weapon by ID
export function getWeaponById(id: string): Weapon | undefined {
  return WEAPONS.find(w => w.id === id);
}
