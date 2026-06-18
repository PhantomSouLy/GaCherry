const rarityOrder = [
  "Common",
  "Rare",
  "Epic",
  "Legendary",
  "Mythical",
  "Eternity"
];

const rarityInfo = {
  Common: {
    label: "1★ Common",
    className: "common",
    description: "Zöld alap kártyák. NPC-k, mobok, kisebb karakterek és egyszerű gyűjthető lapok."
  },

  Rare: {
    label: "2★ Rare",
    className: "rare",
    description: "Kék Cherry skinek. Egyszerűbb outfit, hétköznapi vagy könnyed fantasy témák."
  },

  Epic: {
    label: "3★ Epic",
    className: "epic",
    description: "Lila ritkaság. Különlegesebb világok, wuxia, mitológiai és tematikus Cherry lapok."
  },

  Legendary: {
    label: "4★ Legendary",
    className: "legendary",
    description: "Narancs ritkaság. Látványos, szexibb, részletesebb és egyedibb Cherry skinek."
  },

  Mythical: {
    label: "5★ Mythical",
    className: "mythical",
    description: "Fehér ritkaság. Nagyon ritka, kiemelt és különleges kártyák."
  },

  Eternity: {
    label: "Eternity",
    className: "eternity",
    description: "Piros ritkaság. A Mythical fölötti, extra különleges kártyatípus."
  }
};

const cards = [
  {
    number: 1,
    name: "Cookie",
    rarity: "Common",
    image: "https://placehold.co/400x600/4caf50/ffffff?text=Cookie",
    tags: ["Food", "Item"],
    description: "Egy egyszerű süti kártya. Tárgy jellegű gyűjthető lap."
  },

  {
    number: 2,
    name: "Minecraft Creeper",
    rarity: "Common",
    image: "https://placehold.co/400x600/4caf50/ffffff?text=Creeper",
    tags: ["Mob", "Game"],
    description: "Ikonikus játékbeli mob kártya."
  },

  {
    number: 3,
    name: "Casual Cherry",
    rarity: "Rare",
    image: "https://placehold.co/400x600/2196f3/ffffff?text=Casual+Cherry",
    tags: ["Cherry", "Outfit"],
    description: "Egyszerű, hétköznapi Cherry skin."
  },

  {
    number: 4,
    name: "Gamer Cherry",
    rarity: "Rare",
    image: "https://placehold.co/400x600/2196f3/ffffff?text=Gamer+Cherry",
    tags: ["Cherry", "Outfit", "Gaming"],
    description: "Gamer hangulatú Cherry skin."
  },

  {
    number: 5,
    name: "Wind Chime Cherry",
    rarity: "Epic",
    image: "https://placehold.co/400x600/9c27b0/ffffff?text=Wind+Chime",
    tags: ["Cherry", "Wuxia", "Japanese"],
    description: "Szeles, keleti hangulatú, lágy wuxia Cherry kártya."
  },

  {
    number: 6,
    name: "Tea House Cherry",
    rarity: "Epic",
    image: "https://placehold.co/400x600/9c27b0/ffffff?text=Tea+House",
    tags: ["Cherry", "Japanese", "Cozy"],
    description: "Nyugodt teaházas Cherry skin."
  },

  {
    number: 7,
    name: "Kunoichi Cherry",
    rarity: "Epic",
    image: "https://placehold.co/400x600/9c27b0/ffffff?text=Kunoichi",
    tags: ["Cherry", "Ninja", "Japanese"],
    description: "Japán ninja témájú Cherry kártya."
  },

  {
    number: 8,
    name: "Angel Cherry",
    rarity: "Legendary",
    image: "https://placehold.co/400x600/ff9800/ffffff?text=Angel+Cherry",
    tags: ["Cherry", "Divine", "Event"],
    description: "Legendary, angyali hangulatú Cherry skin."
  },

  {
    number: 9,
    name: "Starfall Cherry",
    rarity: "Legendary",
    image: "https://placehold.co/400x600/ff9800/ffffff?text=Starfall",
    tags: ["Cherry", "Fantasy", "Star"],
    description: "Csillaghullás témájú, látványos Cherry kártya."
  },

  {
    number: 10,
    name: "Bunny Goddess",
    rarity: "Mythical",
    image: "https://placehold.co/400x600/f4f4f4/111111?text=Bunny+Goddess",
    tags: ["Cherry", "Divine", "Limited"],
    description: "Mythical ritkaságú, isteni nyuszi Cherry kártya."
  },

  {
    number: 11,
    name: "Gacha Master Cherry",
    rarity: "Eternity",
    image: "https://placehold.co/400x600/e53935/ffffff?text=Gacha+Master",
    tags: ["Cherry", "Gacha", "Eternity"],
    description: "Eternity ritkaságú kártya. A GaCherry mestere."
  }
];
