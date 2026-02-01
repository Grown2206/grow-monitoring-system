/**
 * BioBizz Nahrstoff-Datenbank
 * Produktkatalog, 16-Wochen Dungeplan, Phasen-Definitionen, Regeln
 */

import {
  Leaf, Flower2, TrendingUp, TreePine, Sparkles, Heart, Waves, Fish, Shield
} from 'lucide-react';

// ── BioBizz Produkte ──────────────────────────────────────────
export const BIOBIZZ_PRODUCTS = [
  {
    id: 'bio-grow',
    name: 'Bio-Grow',
    shortName: 'Grow',
    description: 'Organischer Wachstumsdunger fur vegetative Phase',
    npk: '8-2-6',
    type: 'base-grow',
    category: 'Basis',
    icon: Leaf,
    color: '#10b981',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'bio-bloom',
    name: 'Bio-Bloom',
    shortName: 'Bloom',
    description: 'Organischer Blutedunger fur Blutephase',
    npk: '2-6-3.5',
    type: 'base-bloom',
    category: 'Basis',
    icon: Flower2,
    color: '#ec4899',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'top-max',
    name: 'Top-Max',
    shortName: 'TopMax',
    description: 'Blute-Stimulator fur grossere, schwerere Fruchte',
    npk: '0.2-0.1-0.3',
    type: 'stimulator',
    category: 'Stimulator',
    icon: TrendingUp,
    color: '#f59e0b',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'root-juice',
    name: 'Root-Juice',
    shortName: 'Root',
    description: 'Wurzelstimulator fur kraftiges Wurzelwachstum',
    npk: null,
    type: 'root',
    category: 'Stimulator',
    icon: TreePine,
    color: '#8b5cf6',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'bio-heaven',
    name: 'Bio-Heaven',
    shortName: 'Heaven',
    description: 'Energy-Booster mit Aminosauren',
    npk: null,
    type: 'booster',
    category: 'Booster',
    icon: Sparkles,
    color: '#06b6d4',
    mlRange: { min: 2, max: 5 }
  },
  {
    id: 'acti-vera',
    name: 'Acti-Vera',
    shortName: 'Acti',
    description: 'Pflanzenvitalitat und Immunsystem-Starker',
    npk: null,
    type: 'vitality',
    category: 'Booster',
    icon: Heart,
    color: '#22c55e',
    mlRange: { min: 1, max: 5 }
  },
  {
    id: 'alg-a-mic',
    name: 'Alg-A-Mic',
    shortName: 'Alga',
    description: 'Anti-Stress und Erholungsprodukt aus Algen',
    npk: null,
    type: 'stress',
    category: 'Booster',
    icon: Waves,
    color: '#3b82f6',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'fish-mix',
    name: 'Fish-Mix',
    shortName: 'Fish',
    description: 'Organischer Wachstumsdunger aus Fisch-Emulsion',
    npk: '5-1-4',
    type: 'growth-alt',
    category: 'Basis',
    icon: Fish,
    color: '#f97316',
    mlRange: { min: 1, max: 4 }
  },
  {
    id: 'calmag',
    name: 'CalMag',
    shortName: 'CalMag',
    description: 'Calcium- und Magnesium-Supplement',
    npk: null,
    type: 'supplement',
    category: 'Supplement',
    icon: Shield,
    color: '#a855f7',
    mlRange: { min: 1, max: 2 }
  }
];

// ── Wachstumsphasen ───────────────────────────────────────────
export const GROWTH_PHASES = [
  { id: 'seedling',  name: 'Keimling',      weeks: [1, 2],          color: '#22c55e', icon: '🌱' },
  { id: 'earlyVeg',  name: 'Fruhe Veg',     weeks: [3, 4],          color: '#10b981', icon: '🌿' },
  { id: 'lateVeg',   name: 'Spate Veg',     weeks: [5, 6],          color: '#059669', icon: '🪴' },
  { id: 'preFlower', name: 'Pre-Flower',     weeks: [7, 8],          color: '#f59e0b', icon: '🌼' },
  { id: 'bloom',     name: 'Blute',          weeks: [9, 10, 11, 12], color: '#ec4899', icon: '🌸' },
  { id: 'lateBloom', name: 'Spate Blute',    weeks: [13, 14],        color: '#f43f5e', icon: '🌺' },
  { id: 'flush',     name: 'Flush/Spulung',  weeks: [15, 16],        color: '#6b7280', icon: '💧' }
];

// ── 16-Wochen Dungeplan (Light Mix, ml/L) ─────────────────────
// null = nicht verwenden, Zahl = ml pro Liter
export const BIOBIZZ_SCHEDULE = [
  // Woche 1 - Keimling
  {
    week: 1,
    phase: 'seedling',
    products: {
      'bio-grow': null, 'bio-bloom': null, 'top-max': null,
      'root-juice': 1, 'bio-heaven': 1, 'acti-vera': 1,
      'alg-a-mic': null, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 0.3, max: 0.6 },
    notes: 'Nur Wurzelstimulation und Vitalitat. Sehr vorsichtig giessen.'
  },
  // Woche 2 - Keimling
  {
    week: 2,
    phase: 'seedling',
    products: {
      'bio-grow': null, 'bio-bloom': null, 'top-max': null,
      'root-juice': 2, 'bio-heaven': 2, 'acti-vera': 2,
      'alg-a-mic': 1, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 0.4, max: 0.8 },
    notes: 'Dosis leicht erhohen. Alg-A-Mic fur Stressschutz hinzufugen.'
  },
  // Woche 3 - Fruhe Vegetation
  {
    week: 3,
    phase: 'earlyVeg',
    products: {
      'bio-grow': 1, 'bio-bloom': null, 'top-max': null,
      'root-juice': 3, 'bio-heaven': 2, 'acti-vera': 3,
      'alg-a-mic': 1, 'fish-mix': 1, 'calmag': null
    },
    ecTarget: { min: 0.6, max: 1.0 },
    notes: 'Bio-Grow und Fish-Mix starten. Pflanze beginnt aktives Wachstum.'
  },
  // Woche 4 - Fruhe Vegetation
  {
    week: 4,
    phase: 'earlyVeg',
    products: {
      'bio-grow': 2, 'bio-bloom': null, 'top-max': null,
      'root-juice': 4, 'bio-heaven': 2, 'acti-vera': 4,
      'alg-a-mic': 2, 'fish-mix': 2, 'calmag': 1
    },
    ecTarget: { min: 0.8, max: 1.2 },
    notes: 'CalMag hinzufugen. Volle Wurzelstimulation.'
  },
  // Woche 5 - Spate Vegetation
  {
    week: 5,
    phase: 'lateVeg',
    products: {
      'bio-grow': 3, 'bio-bloom': null, 'top-max': null,
      'root-juice': 4, 'bio-heaven': 3, 'acti-vera': 5,
      'alg-a-mic': 3, 'fish-mix': 3, 'calmag': 1
    },
    ecTarget: { min: 1.0, max: 1.4 },
    notes: 'Maximale vegetative Nahrstoffzufuhr. Starkes Wachstum.'
  },
  // Woche 6 - Spate Vegetation
  {
    week: 6,
    phase: 'lateVeg',
    products: {
      'bio-grow': 4, 'bio-bloom': null, 'top-max': null,
      'root-juice': 4, 'bio-heaven': 3, 'acti-vera': 5,
      'alg-a-mic': 3, 'fish-mix': 4, 'calmag': 1
    },
    ecTarget: { min: 1.2, max: 1.6 },
    notes: 'Peak der vegetativen Dungung. Bio-Grow und Fish-Mix auf Maximum.'
  },
  // Woche 7 - Pre-Flower
  {
    week: 7,
    phase: 'preFlower',
    products: {
      'bio-grow': 3, 'bio-bloom': 1, 'top-max': 1,
      'root-juice': 4, 'bio-heaven': 3, 'acti-vera': 4,
      'alg-a-mic': 3, 'fish-mix': 2, 'calmag': 1
    },
    ecTarget: { min: 1.2, max: 1.6 },
    notes: 'Ubergang: Bio-Bloom und Top-Max starten. Bio-Grow reduzieren.'
  },
  // Woche 8 - Pre-Flower
  {
    week: 8,
    phase: 'preFlower',
    products: {
      'bio-grow': 2, 'bio-bloom': 2, 'top-max': 1,
      'root-juice': 4, 'bio-heaven': 4, 'acti-vera': 4,
      'alg-a-mic': 3, 'fish-mix': 1, 'calmag': 1
    },
    ecTarget: { min: 1.2, max: 1.8 },
    notes: 'Gleichgewicht zwischen Grow und Bloom. Fish-Mix fast auslaufen lassen.'
  },
  // Woche 9 - Blute
  {
    week: 9,
    phase: 'bloom',
    products: {
      'bio-grow': 1, 'bio-bloom': 3, 'top-max': 2,
      'root-juice': null, 'bio-heaven': 4, 'acti-vera': 4,
      'alg-a-mic': 4, 'fish-mix': null, 'calmag': 1
    },
    ecTarget: { min: 1.4, max: 2.0 },
    notes: 'Volle Blute. Root-Juice und Fish-Mix stoppen. Bio-Bloom erhohen.'
  },
  // Woche 10 - Blute
  {
    week: 10,
    phase: 'bloom',
    products: {
      'bio-grow': null, 'bio-bloom': 4, 'top-max': 3,
      'root-juice': null, 'bio-heaven': 5, 'acti-vera': 4,
      'alg-a-mic': 4, 'fish-mix': null, 'calmag': 1
    },
    ecTarget: { min: 1.4, max: 2.0 },
    notes: 'Peak Blute-Dungung. Bio-Grow komplett stoppen.'
  },
  // Woche 11 - Blute
  {
    week: 11,
    phase: 'bloom',
    products: {
      'bio-grow': null, 'bio-bloom': 4, 'top-max': 4,
      'root-juice': null, 'bio-heaven': 5, 'acti-vera': 4,
      'alg-a-mic': 4, 'fish-mix': null, 'calmag': 1
    },
    ecTarget: { min: 1.4, max: 2.0 },
    notes: 'Top-Max auf Maximum fur maximale Fruchtentwicklung.'
  },
  // Woche 12 - Blute
  {
    week: 12,
    phase: 'bloom',
    products: {
      'bio-grow': null, 'bio-bloom': 4, 'top-max': 4,
      'root-juice': null, 'bio-heaven': 5, 'acti-vera': 3,
      'alg-a-mic': 3, 'fish-mix': null, 'calmag': 1
    },
    ecTarget: { min: 1.2, max: 1.8 },
    notes: 'Beginn der Reduktion. Acti-Vera und Alg-A-Mic leicht senken.'
  },
  // Woche 13 - Spate Blute
  {
    week: 13,
    phase: 'lateBloom',
    products: {
      'bio-grow': null, 'bio-bloom': 3, 'top-max': 3,
      'root-juice': null, 'bio-heaven': 4, 'acti-vera': 2,
      'alg-a-mic': 2, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 1.0, max: 1.4 },
    notes: 'Dungung reduzieren. Pflanze auf Ernte vorbereiten.'
  },
  // Woche 14 - Spate Blute
  {
    week: 14,
    phase: 'lateBloom',
    products: {
      'bio-grow': null, 'bio-bloom': 2, 'top-max': 2,
      'root-juice': null, 'bio-heaven': 3, 'acti-vera': 1,
      'alg-a-mic': 1, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 0.6, max: 1.0 },
    notes: 'Letzte Dungerwoche. Ab nachster Woche nur noch Wasser.'
  },
  // Woche 15 - Flush
  {
    week: 15,
    phase: 'flush',
    products: {
      'bio-grow': null, 'bio-bloom': null, 'top-max': null,
      'root-juice': null, 'bio-heaven': null, 'acti-vera': null,
      'alg-a-mic': null, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 0.0, max: 0.4 },
    notes: 'Nur sauberes Wasser. Restliche Nahrstoffe ausschwemmen.'
  },
  // Woche 16 - Flush
  {
    week: 16,
    phase: 'flush',
    products: {
      'bio-grow': null, 'bio-bloom': null, 'top-max': null,
      'root-juice': null, 'bio-heaven': null, 'acti-vera': null,
      'alg-a-mic': null, 'fish-mix': null, 'calmag': null
    },
    ecTarget: { min: 0.0, max: 0.3 },
    notes: 'Letzte Flush-Woche. Ernte wenn Trichome milchig/bernstein.'
  }
];

// ── Substrat-Modifikatoren ─────────────────────────────────────
export const SUBSTRATE_MODIFIERS = {
  lightMix: { label: 'Light Mix', modifier: 1.0, description: 'Standard BioBizz Dosierung' },
  allMix:   { label: 'All Mix',   modifier: 0.75, description: '25% weniger (vorgedungte Erde)' },
  cocoMix:  { label: 'Coco Mix',  modifier: 1.1, description: '10% mehr (Coco braucht mehr CalMag)' }
};

// ── Wichtige Regeln ────────────────────────────────────────────
export const BIOBIZZ_RULES = {
  phTarget: { min: 6.2, max: 6.5 },
  ecMaxBase: 0.4,          // max EC des Basiswassers
  alternateFeedings: true,  // Abwechselnd Wasser/Dunger
  minHeightForFeeding: 10,  // cm - erst dunger ab 10cm
  minLeavesForFeeding: 2,   // mindestens 2 echte Blatter
  flushWeeks: 2,            // 2 Wochen Flush vor Ernte
  maxWeeks: 16
};

// ── Hilfsfunktionen ────────────────────────────────────────────

/** Finde Phase fur eine bestimmte Woche */
export function getPhaseForWeek(week) {
  return GROWTH_PHASES.find(p => p.weeks.includes(week)) || GROWTH_PHASES[GROWTH_PHASES.length - 1];
}

/** Berechne Grow-Woche aus plantedDate */
export function calculateGrowWeek(plantedDate) {
  if (!plantedDate) return null;
  const planted = new Date(plantedDate);
  const now = new Date();
  const diffMs = now - planted;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(diffDays / 7));
}

/** Hole Dungeplan fur eine bestimmte Woche */
export function getScheduleForWeek(week) {
  const clampedWeek = Math.min(Math.max(1, week), 16);
  return BIOBIZZ_SCHEDULE.find(s => s.week === clampedWeek) || BIOBIZZ_SCHEDULE[BIOBIZZ_SCHEDULE.length - 1];
}

/** Berechne Dosierung fur einen Tank */
export function calculateDosage(waterLiters, week, substrate = 'lightMix') {
  const schedule = getScheduleForWeek(week);
  const mod = SUBSTRATE_MODIFIERS[substrate]?.modifier || 1.0;
  const phase = getPhaseForWeek(week);

  const products = [];
  let totalMl = 0;

  BIOBIZZ_PRODUCTS.forEach(product => {
    const mlPerLiter = schedule.products[product.id];
    if (mlPerLiter != null && mlPerLiter > 0) {
      const adjustedMl = Math.round(mlPerLiter * mod * 10) / 10;
      const totalForProduct = Math.round(adjustedMl * waterLiters * 10) / 10;
      totalMl += totalForProduct;
      products.push({
        ...product,
        mlPerLiter: adjustedMl,
        totalMl: totalForProduct
      });
    }
  });

  return {
    week,
    phase,
    substrate,
    waterLiters,
    products,
    totalMl: Math.round(totalMl * 10) / 10,
    ecTarget: schedule.ecTarget,
    notes: schedule.notes
  };
}

/** Finde Produkt nach ID */
export function getProductById(id) {
  return BIOBIZZ_PRODUCTS.find(p => p.id === id);
}
