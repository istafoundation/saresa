// Hindu Mythology Artifacts - Story pieces user unlocks through leveling
// Each artifact contains a fascinating story from the epics

export interface Artifact {
  id: string;
  title: string;
  subtitle: string;
  unlockLevel: number;
  story: string;
  funFact: string;
  icon: string; // Emoji for now, can be replaced with images
}

export const ARTIFACTS: Artifact[] = [
  {
    id: 'ganesha-wisdom',
    title: 'The Elephant-Headed God',
    subtitle: 'How Ganesha Got His Wisdom',
    unlockLevel: 2,
    icon: '🐘',
    story: `Long ago, Goddess Parvati created a boy from sandalwood paste to guard her chambers while she bathed. When Lord Shiva returned, the boy blocked his path, not knowing who he was.

In anger, Shiva severed the boy's head. When Parvati discovered this, she was devastated. To console her, Shiva sent his followers to bring the head of the first creature they found sleeping with its head facing north.

They found an elephant, and Shiva attached its head to the boy, bringing him back to life. He named him Ganesha and blessed him to be worshipped before all other gods.

But here's the cleverest part: When Shiva challenged his sons to race around the world, Kartikeya immediately set off on his peacock. Ganesha simply walked around his parents, saying "You ARE my world." He won, proving wisdom triumphs over speed!`,
    funFact: 'Ganesha is always worshipped first before any new beginning, even before other gods!',
  },
  {
    id: 'hanuman-strength',
    title: 'Son of the Wind',
    subtitle: 'Hanuman\'s Forgotten Powers',
    unlockLevel: 3,
    icon: '🐵',
    story: `As a child, Hanuman was incredibly mischievous. One morning, he saw the rising sun and thought it was a ripe mango. Being the son of Vayu (the Wind God), he leaped into the sky to eat it!

The gods panicked seeing someone approaching the sun. Indra, king of gods, hurled his thunderbolt at the child, striking his jaw (hanu). Hanuman fell to Earth, unconscious.

Vayu, furious at the attack on his son, withdrew all air from the universe. Living beings began to suffocate! The gods rushed to apologize and blessed young Hanuman with incredible powers - immortality, strength, wisdom, and the ability to grow or shrink at will.

But to prevent more mischief, they made him forget these powers until reminded in his time of need. Years later, during the search for Sita, Jambavan reminded Hanuman of his powers, and he leaped across the ocean to Lanka!`,
    funFact: 'Hanuman\'s jaw (hanu) was injured, giving him his name. "Hanuman" literally means "one with a prominent jaw."',
  },
  {
    id: 'krishna-flute',
    title: 'The Divine Melody',
    subtitle: 'Why Krishna Plays the Flute',
    unlockLevel: 4,
    icon: '🪈',
    story: `In Vrindavan, young Krishna was beloved by all - the gopas (cowherds), gopis (milkmaids), and even the cows would follow his enchanting flute music.

But why the flute? The flute is hollow, empty of ego. It represents complete surrender to the divine. When Krishna breathes through it, the most beautiful music emerges - just as divine grace flows through those who empty themselves of pride.

One evening, the gopis heard Krishna's flute and were so enchanted that they left everything - cooking, chores, even sleeping children - to dance with him in the Rasa Leela. To dance with all of them simultaneously, Krishna multiplied himself, and each gopi felt she alone was dancing with the Lord.

This is the supreme love - the soul's longing for the divine! The flute calls, and the devoted heart cannot resist.`,
    funFact: 'The holes in the flute represent the nine openings in the human body, through which divine breath flows.',
  },
  {
    id: 'arjuna-bow',
    title: 'Gandiva',
    subtitle: 'The Bow That Never Missed',
    unlockLevel: 5,
    icon: '🏹',
    story: `Gandiva was no ordinary bow. Created by Brahma himself, it was used by Soma (the Moon god), then Varuna (god of oceans), before being given to Arjuna.

The bow was as tall as a palm tree, made of celestial wood, and strung with a string that could never break. It came with two inexhaustible quivers - no matter how many arrows Arjuna shot, the quivers never emptied!

During the Khandava forest burning, Arjuna and Krishna helped Agni (fire god) consume the forest. With Gandiva, Arjuna created a canopy of arrows so dense that not a single drop of Indra's rain could penetrate to extinguish the flames!

After the Mahabharata war, Arjuna was instructed to return Gandiva to the ocean, for its purpose was fulfilled. The bow that had sung through countless battles finally rested.`,
    funFact: 'Gandiva produced a sound like thunder when Arjuna drew it - this sound alone terrified enemies!',
  },
  {
    id: 'shiva-trident',
    title: 'Trishula',
    subtitle: 'The Three-Pronged Weapon',
    unlockLevel: 6,
    icon: '🔱',
    story: `Lord Shiva's Trishula is not merely a weapon - it represents the three fundamental aspects of existence: creation, preservation, and destruction (Brahma, Vishnu, Shiva).

The three prongs also symbolize the three gunas (qualities): Sattva (purity), Rajas (activity), and Tamas (inertia). Or the three times: past, present, and future.

With this trident, Shiva performed legendary feats. When the demon Tripurasura built three flying cities of gold, silver, and iron that could only be destroyed when aligned once in a thousand years, Shiva waited patiently. At the precise moment, with the Earth as his chariot and Mount Meru as his bow, he destroyed all three cities with a single arrow!

The Trishula reminds us that Shiva transcends and controls all aspects of existence.`,
    funFact: 'The Trishula is also associated with the three energy channels (nadis) in the subtle body: Ida, Pingala, and Sushumna.',
  },
  {
    id: 'durga-lion',
    title: 'The Invincible Mother',
    subtitle: 'Durga\'s Victory Over Mahishasura',
    unlockLevel: 7,
    icon: '🦁',
    story: `Mahishasura, the buffalo demon, had received a boon that no man or god could kill him. Drunk with power, he conquered the heavens and tormented the gods and humans alike.

The desperate gods combined their divine energies, and from this fusion emerged Durga - a goddess of immense power and radiant beauty. Each god contributed: Shiva gave his trident, Vishnu his discus, Indra his thunderbolt. She rode a fierce lion.

For nine nights, Durga battled Mahishasura as he shapeshifted through various forms. On the tenth day (celebrated as Vijayadashami), she finally cornered him as he half-emerged from a buffalo form.

With her trident, she struck him down, ending his reign of terror. This is why we celebrate Navratri - nine nights of the divine feminine's triumph over evil!`,
    funFact: 'Durga\'s name means "the invincible" - she who is beyond reach of evil.',
  },
  {
    id: 'rama-arrow',
    title: 'The Infallible Arrow',
    subtitle: 'Rama\'s Killing of Ravana',
    unlockLevel: 8,
    icon: '➶',
    story: `The battle of Lanka raged for days. Rama had cut off Ravana's heads countless times, but they kept regenerating! The ten-headed demon seemed immortal.

Then Vibhishana, Ravana's righteous brother who had joined Rama, revealed the secret: Ravana had stored nectar of immortality in his navel. Only by destroying it could he be killed.

Rama took the Brahmastra, a divine weapon given by sage Agastya. As he pulled the bowstring, the gods watched in anticipation. The arrow flew like lightning, striking Ravana's navel.

The demon king, who had terrorized the three worlds, finally fell. The gods showered flowers from the heavens. Sita was rescued, and dharma was restored.

This victory is celebrated as Dussehra, when effigies of Ravana are burned to symbolize the eternal triumph of good over evil.`,
    funFact: 'Ravana was actually a great devotee of Shiva and a brilliant scholar - but his pride became his downfall.',
  },
  {
    id: 'vishnu-chakra',
    title: 'Sudarshana Chakra',
    subtitle: 'The Spinning Discus of Vishnu',
    unlockLevel: 9,
    icon: '☸️',
    story: `The Sudarshana Chakra is Lord Vishnu's most powerful weapon - a spinning discus with a hundred and eight serrated edges that blazes with the light of a thousand suns.

When Vishnu releases it, the Chakra can travel across universes, never missing its target, and always returns to Vishnu's finger. No being in creation can stop or outrun it.

Its creation has many tales. One says it was fashioned by Vishwakarma (the divine architect) from the Sun's excess energy. Another says Shiva gifted it to Vishnu after being pleased with his devotion.

The Chakra represents the cycle of time (kala chakra), cosmic order, and the supreme will that maintains balance in the universe. It destroys evil not out of anger, but to restore dharma.`,
    funFact: 'Sudarshana means "auspicious vision" - the discus that reveals the beautiful truth by destroying illusion.',
  },
  {
    id: 'lakshmi-lotus',
    title: 'Goddess of Fortune',
    subtitle: 'Lakshmi\'s Emergence',
    unlockLevel: 10,
    icon: '🪷',
    story: `During the Samudra Manthan (churning of the cosmic ocean), the gods and demons churned the ocean using Mount Mandara as the churning rod and Vasuki the serpent as the rope.

Many treasures emerged: Kamadhenu (the wish-fulfilling cow), Kalpavriksha (the wish-fulfilling tree), and the deadly Halahala poison that Shiva drank to save creation.

Finally, standing upon a lotus, emerged Lakshmi - the goddess of wealth, fortune, and beauty. She radiated such splendor that both gods and demons were mesmerized. She chose to marry Vishnu, the preserver of the universe.

Lakshmi sits on a lotus because, like the lotus that grows in muddy water yet remains pure, true prosperity comes to those who remain untainted by the world's impurities.

She is worshipped during Diwali, when homes are lit to welcome her presence and auspiciousness.`,
    funFact: 'Lakshmi is said to never stay where there is dirt, laziness, or discord - that\'s why Diwali cleaning!',
  },
];

// Get artifact by ID
export function getArtifactById(id: string): Artifact | undefined {
  return ARTIFACTS.find(a => a.id === id);
}

// Get artifacts unlocked at or before a level
export function getUnlockedArtifacts(level: number): Artifact[] {
  return ARTIFACTS.filter(a => a.unlockLevel <= level);
}
