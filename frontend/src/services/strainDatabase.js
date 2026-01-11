/**
 * Strain Database
 * Lokale Datenbank mit populären Cannabis-Sorten
 * Kann später durch API-Integration (Seedfinder, Leafly) erweitert werden
 */

export const strainDatabase = [
  // Indica Dominant
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    breeder: 'Sensi Seeds',
    type: 'Indica',
    genetics: 'Afghani x Thai',
    thc: { min: 16, max: 21, avg: 18 },
    cbd: { min: 0.1, max: 0.3, avg: 0.2 },
    floweringTime: { min: 45, max: 50, avg: 47 },
    yield: { indoor: { min: 400, max: 500 }, outdoor: { min: 575, max: 625 } },
    difficulty: 'easy',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
    flavors: ['Earthy', 'Sweet', 'Spicy'],
    terpenes: ['Myrcene', 'Caryophyllene', 'Limonene'],
    description: 'Klassische Indica mit starker Entspannungswirkung'
  },
  {
    id: 'og-kush',
    name: 'OG Kush',
    breeder: 'Multiple',
    type: 'Indica',
    genetics: 'Chemdawg x Lemon Thai x Pakistani Kush',
    thc: { min: 19, max: 26, avg: 23 },
    cbd: { min: 0.1, max: 0.3, avg: 0.2 },
    floweringTime: { min: 55, max: 65, avg: 60 },
    yield: { indoor: { min: 425, max: 475 }, outdoor: { min: 500, max: 550 } },
    difficulty: 'moderate',
    effects: ['Euphoric', 'Happy', 'Relaxed', 'Uplifted'],
    flavors: ['Earthy', 'Pine', 'Woody'],
    terpenes: ['Myrcene', 'Limonene', 'Caryophyllene'],
    description: 'Legendäre West Coast Genetik mit starker Wirkung'
  },
  {
    id: 'granddaddy-purple',
    name: 'Granddaddy Purple',
    breeder: 'Ken Estes',
    type: 'Indica',
    genetics: 'Big Bud x Purple Urkle',
    thc: { min: 17, max: 23, avg: 20 },
    cbd: { min: 0.1, max: 0.1, avg: 0.1 },
    floweringTime: { min: 60, max: 70, avg: 65 },
    yield: { indoor: { min: 450, max: 550 }, outdoor: { min: 600, max: 3000 } },
    difficulty: 'easy',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
    flavors: ['Grape', 'Berry', 'Sweet'],
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    description: 'Lila Blüten mit intensivem Beerenaroma'
  },

  // Sativa Dominant
  {
    id: 'sour-diesel',
    name: 'Sour Diesel',
    breeder: 'Multiple',
    type: 'Sativa',
    genetics: 'Chemdawg 91 x Super Skunk',
    thc: { min: 20, max: 25, avg: 22 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 70, max: 77, avg: 73 },
    yield: { indoor: { min: 450, max: 600 }, outdoor: { min: 500, max: 600 } },
    difficulty: 'moderate',
    effects: ['Energetic', 'Euphoric', 'Creative', 'Uplifted'],
    flavors: ['Diesel', 'Pungent', 'Earthy'],
    terpenes: ['Caryophyllene', 'Limonene', 'Myrcene'],
    description: 'Energetische Sativa mit charakteristischem Diesel-Aroma'
  },
  {
    id: 'jack-herer',
    name: 'Jack Herer',
    breeder: 'Sensi Seeds',
    type: 'Sativa',
    genetics: 'Haze x Northern Lights #5 x Shiva Skunk',
    thc: { min: 15, max: 24, avg: 18 },
    cbd: { min: 0.1, max: 0.3, avg: 0.2 },
    floweringTime: { min: 50, max: 70, avg: 60 },
    yield: { indoor: { min: 350, max: 450 }, outdoor: { min: 450, max: 600 } },
    difficulty: 'moderate',
    effects: ['Energetic', 'Creative', 'Euphoric', 'Uplifted'],
    flavors: ['Earthy', 'Pine', 'Woody'],
    terpenes: ['Terpinolene', 'Pinene', 'Caryophyllene'],
    description: 'Preisgekrönte Sativa mit ausgewogener Wirkung'
  },
  {
    id: 'green-crack',
    name: 'Green Crack',
    breeder: 'Multiple',
    type: 'Sativa',
    genetics: 'Skunk #1 x Unknown Indica',
    thc: { min: 15, max: 25, avg: 20 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 50, max: 60, avg: 55 },
    yield: { indoor: { min: 400, max: 500 }, outdoor: { min: 500, max: 600 } },
    difficulty: 'easy',
    effects: ['Energetic', 'Focused', 'Happy', 'Uplifted'],
    flavors: ['Citrus', 'Earthy', 'Sweet'],
    terpenes: ['Myrcene', 'Caryophyllene', 'Pinene'],
    description: 'Stark energetisierende Sativa für den Tag'
  },

  // Hybrid (Balanced)
  {
    id: 'blue-dream',
    name: 'Blue Dream',
    breeder: 'Multiple',
    type: 'Hybrid',
    genetics: 'Blueberry x Haze',
    thc: { min: 17, max: 24, avg: 21 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 60, max: 70, avg: 65 },
    yield: { indoor: { min: 450, max: 600 }, outdoor: { min: 500, max: 600 } },
    difficulty: 'easy',
    effects: ['Happy', 'Euphoric', 'Relaxed', 'Creative'],
    flavors: ['Berry', 'Sweet', 'Herbal'],
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    description: 'Beliebter Hybrid mit ausgewogener Wirkung'
  },
  {
    id: 'girl-scout-cookies',
    name: 'Girl Scout Cookies',
    breeder: 'Cookie Fam Genetics',
    type: 'Hybrid',
    genetics: 'OG Kush x Durban Poison',
    thc: { min: 18, max: 28, avg: 23 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 56, max: 63, avg: 60 },
    yield: { indoor: { min: 300, max: 400 }, outdoor: { min: 400, max: 500 } },
    difficulty: 'difficult',
    effects: ['Happy', 'Relaxed', 'Euphoric', 'Creative'],
    flavors: ['Sweet', 'Earthy', 'Pungent'],
    terpenes: ['Caryophyllene', 'Limonene', 'Humulene'],
    description: 'Potenter Hybrid mit süßem Cookie-Geschmack'
  },
  {
    id: 'gorilla-glue',
    name: 'Gorilla Glue #4',
    breeder: 'GG Strains',
    type: 'Hybrid',
    genetics: 'Chocolate Diesel x Sour Dubb x Chem Sister',
    thc: { min: 25, max: 30, avg: 27 },
    cbd: { min: 0.1, max: 0.1, avg: 0.1 },
    floweringTime: { min: 56, max: 63, avg: 60 },
    yield: { indoor: { min: 500, max: 600 }, outdoor: { min: 600, max: 800 } },
    difficulty: 'moderate',
    effects: ['Relaxed', 'Euphoric', 'Happy', 'Sleepy'],
    flavors: ['Diesel', 'Coffee', 'Pungent'],
    terpenes: ['Caryophyllene', 'Myrcene', 'Limonene'],
    description: 'Extrem potenter Hybrid mit hohem THC-Gehalt'
  },
  {
    id: 'white-widow',
    name: 'White Widow',
    breeder: 'Green House Seeds',
    type: 'Hybrid',
    genetics: 'Brazilian Sativa x South Indian Indica',
    thc: { min: 18, max: 25, avg: 20 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 56, max: 63, avg: 60 },
    yield: { indoor: { min: 450, max: 500 }, outdoor: { min: 550, max: 600 } },
    difficulty: 'easy',
    effects: ['Euphoric', 'Energetic', 'Creative', 'Happy'],
    flavors: ['Earthy', 'Woody', 'Spicy'],
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    description: 'Legendärer Dutch Hybrid mit weißen Trichomen'
  },

  // Autoflower
  {
    id: 'northern-lights-auto',
    name: 'Northern Lights Auto',
    breeder: 'Royal Queen Seeds',
    type: 'Autoflower',
    genetics: 'Northern Lights x Ruderalis',
    thc: { min: 14, max: 18, avg: 16 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 70, max: 77, avg: 73 },
    yield: { indoor: { min: 400, max: 450 }, outdoor: { min: 100, max: 150 } },
    difficulty: 'easy',
    effects: ['Relaxed', 'Sleepy', 'Happy'],
    flavors: ['Earthy', 'Sweet', 'Spicy'],
    terpenes: ['Myrcene', 'Caryophyllene', 'Limonene'],
    description: 'Einfach zu growende Autoflower-Version'
  },
  {
    id: 'amnesia-haze-auto',
    name: 'Amnesia Haze Auto',
    breeder: 'Dinafem',
    type: 'Autoflower',
    genetics: 'Amnesia Haze x Ruderalis',
    thc: { min: 16, max: 20, avg: 18 },
    cbd: { min: 0.1, max: 0.2, avg: 0.1 },
    floweringTime: { min: 70, max: 80, avg: 75 },
    yield: { indoor: { min: 400, max: 500 }, outdoor: { min: 100, max: 200 } },
    difficulty: 'moderate',
    effects: ['Energetic', 'Euphoric', 'Creative'],
    flavors: ['Citrus', 'Earthy', 'Lemon'],
    terpenes: ['Limonene', 'Caryophyllene', 'Myrcene'],
    description: 'Sativa-dominante Autoflower mit Haze-Genetik'
  },

  // CBD Strains
  {
    id: 'charlotte-s-web',
    name: "Charlotte's Web",
    breeder: 'Stanley Brothers',
    type: 'CBD',
    genetics: 'High CBD Hemp',
    thc: { min: 0.3, max: 1, avg: 0.5 },
    cbd: { min: 15, max: 20, avg: 17 },
    floweringTime: { min: 60, max: 70, avg: 65 },
    yield: { indoor: { min: 400, max: 500 }, outdoor: { min: 500, max: 600 } },
    difficulty: 'easy',
    effects: ['Relaxed', 'Focused', 'Clear-headed'],
    flavors: ['Earthy', 'Pine', 'Citrus'],
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    description: 'Hochpotente CBD-Sorte mit minimalem THC'
  },
  {
    id: 'acdc',
    name: 'ACDC',
    breeder: 'Resin Seeds',
    type: 'CBD',
    genetics: 'Cannatonic Phenotype',
    thc: { min: 0.5, max: 1.5, avg: 1 },
    cbd: { min: 16, max: 24, avg: 20 },
    floweringTime: { min: 56, max: 63, avg: 60 },
    yield: { indoor: { min: 400, max: 500 }, outdoor: { min: 500, max: 600 } },
    difficulty: 'moderate',
    effects: ['Relaxed', 'Uplifted', 'Clear-headed'],
    flavors: ['Earthy', 'Woody', 'Pine'],
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    description: 'Ausgewogenes CBD:THC Verhältnis (~20:1)'
  }
];

/**
 * Suche Strains nach Name
 */
export const searchStrains = (query) => {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return strainDatabase.filter(strain =>
    strain.name.toLowerCase().includes(lowerQuery) ||
    strain.breeder.toLowerCase().includes(lowerQuery) ||
    strain.genetics.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Max 10 Ergebnisse
};

/**
 * Hole Strain by ID
 */
export const getStrainById = (id) => {
  return strainDatabase.find(strain => strain.id === id);
};

/**
 * Hole Strain by Name (exakte Übereinstimmung)
 */
export const getStrainByName = (name) => {
  return strainDatabase.find(strain =>
    strain.name.toLowerCase() === name.toLowerCase()
  );
};

/**
 * Filter Strains by Type
 */
export const getStrainsByType = (type) => {
  return strainDatabase.filter(strain => strain.type === type);
};

/**
 * Hole alle Breeder (unique)
 */
export const getAllBreeders = () => {
  return [...new Set(strainDatabase.map(s => s.breeder))].sort();
};

/**
 * Difficulty Level Helper
 */
export const getDifficultyInfo = (difficulty) => {
  const levels = {
    easy: { label: 'Anfänger', color: 'text-emerald-400', desc: 'Ideal für Einsteiger' },
    moderate: { label: 'Mittel', color: 'text-amber-400', desc: 'Etwas Erfahrung empfohlen' },
    difficult: { label: 'Schwer', color: 'text-red-400', desc: 'Für Fortgeschrittene' }
  };
  return levels[difficulty] || levels.moderate;
};
