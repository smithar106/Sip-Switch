import type { Archetype, FlavourTag, OnboardingAnswers, ArchetypeId } from '../types';
import type { UserTasteVector } from '../types/supabase';

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  bitter: {
    id: 'bitter', emoji: '🌿', name: 'The Botanical Seeker',
    tagline: 'You want depth, bitterness, and something that feels grown-up.',
    description: "You're not here for sweet. You want NA drinks that taste like they were crafted — bitter aperitifs, herbal tonics, complex shrubs. The kind of drink that rewards attention.",
    categories: ['NA Aperitifs', 'Herbal Tonics', 'Shrubs & Switchels'],
    primaryFlavours: ['bitter', 'herbal', 'complex'],
    examples: ['Ghia', 'Curious Elixirs', 'Pentire'],
  },
  carbonated: {
    id: 'carbonated', emoji: '🫧', name: 'The Sparkling Sipper',
    tagline: 'Bubbles are non-negotiable. You drink with your eyes and your ears.',
    description: "The pop of a can, the fizz in the glass — that's half the experience for you. NA sparkling wines, craft sodas with complexity, sparkling botanicals. It has to feel celebratory.",
    categories: ['NA Sparkling Wine', 'Craft Sodas', 'Sparkling Botanicals'],
    primaryFlavours: ['carbonated', 'light', 'citrus'],
    examples: ['Surely', "Lyre's Classico", 'Waterloo Sparkling'],
  },
  complex: {
    id: 'complex', emoji: '🍷', name: 'The Connoisseur',
    tagline: "You're not giving up the experience of a great drink — just the alcohol.",
    description: "Mouthfeel, finish, acidity, structure — you notice all of it. NA wines and spirits that are actually crafted, not just grape juice. You'll be the one converting people at dinner parties.",
    categories: ['NA Wine', 'NA Spirits', 'Craft Kombuchas'],
    primaryFlavours: ['complex', 'dry', 'dark_fruit'],
    examples: ['Leitz Eins Zwei Zero', 'Seedlip', 'Wild Tonic'],
  },
  dry: {
    id: 'dry', emoji: '🧊', name: 'The Minimalist',
    tagline: 'Nothing sweet, nothing fussy. Just something clean and satisfying.',
    description: "You drink to complement a moment, not to make one. Dry, still, refined — NA wines with real structure, sparkling waters with a point of view, or a cold brew with intention.",
    categories: ['Dry NA Wine', 'Sparkling Water', 'Cold Brew'],
    primaryFlavours: ['dry', 'clean', 'complex'],
    examples: ['Thomson & Scott Noughty', 'Alder', 'Rowdy Mermaid'],
  },
  bold: {
    id: 'bold', emoji: '🍸', name: 'The Cocktail Purist',
    tagline: 'You want the full cocktail experience — the ritual, the glass, the flavour.',
    description: "The drink is the event. You want NA spirits that actually mix, cocktail kits that impress, and something that looks as good as it tastes. Mocktail is a word you never use.",
    categories: ['NA Spirits', 'NA Cocktail Kits', 'Adaptogen Drinks'],
    primaryFlavours: ['bold', 'complex', 'bitter'],
    examples: ['Monday Gin', "Lyre's", 'Kin Euphorics'],
  },
  light: {
    id: 'light', emoji: '☀️', name: 'The Easy Drinker',
    tagline: 'Refreshing, sessionable, and nothing that requires explanation.',
    description: "You want something you can reach for without thinking — at a BBQ, after a run, at a picnic. Light, clean, and genuinely satisfying. NA beer and cider territory, done right.",
    categories: ['NA Beer', 'NA Cider', 'Fruit Kefir'],
    primaryFlavours: ['light', 'carbonated', 'clean'],
    examples: ['Athletic Brewing', 'Partake', 'Bravus'],
  },
};

export const SWAP_MAP = [
  { from: '🍺 IPA', to: 'Athletic Brewing Run Wild IPA', reason: 'Same hop profile, zero alcohol' },
  { from: '🍺 Guinness', to: 'Guinness 0.0', reason: 'Identical — they nailed it' },
  { from: '🍷 Cabernet', to: 'Leitz Eins Zwei Zero Cabernet', reason: 'Tannins, structure, the works' },
  { from: '🍷 Sauvignon Blanc', to: 'Thomson & Scott Noughty', reason: 'Bright acidity, clean finish' },
  { from: '🍸 Negroni', to: "Lyre's Negroni Kit", reason: 'Bitter, complex, ritual intact' },
  { from: '🍸 Gin & Tonic', to: 'Monday Gin + Fever Tree Tonic', reason: 'Botanical, refreshing, identical vibe' },
  { from: '🥂 Prosecco', to: 'Surely Sparkling Rosé', reason: 'Celebratory, dry, actually good' },
  { from: '🍹 Aperol Spritz', to: 'Ghia + Sparkling Water', reason: 'Bitter orange, aperitivo mood' },
  { from: '🥃 Whisky', to: "Lyre's American Malt", reason: 'Oak, vanilla, sipping spirit' },
  { from: '🍹 Mojito', to: 'Curious Elixirs No. 1', reason: 'Herbaceous, citrus, complex' },
];

// ── Answer scoring map (shared between archetype calc and dimension compute) ──

const ANSWER_SCORES: Record<string, Partial<Record<string, number>>> = {
  'q1_a': { bitter: 3, carbonated: 2 },
  'q1_b': { complex: 3, dry: 2 },
  'q1_c': { bold: 3, complex: 1 },
  'q1_d': { light: 3, carbonated: 1 },
  'q2_a': { complex: 3, dry: 1 },
  'q2_b': { carbonated: 2, light: 2, bold: 1 },
  'q2_c': { bold: 2, complex: 2 },
  'q2_d': { light: 3, carbonated: 2 },
  'q3_a': { complex: 3, bitter: 1 },
  'q3_b': { light: 2, carbonated: 2 },
  'q3_c': { bold: 3, dry: 1 },
  'q3_d': { light: 3, dry: 2 },
  'q4_a': { carbonated: 4 },
  'q4_b': { dry: 2, complex: 2 },
  'q4_c': { bold: 3, complex: 1 },
  'q4_d': { light: 4 },
  'q5_a': { complex: 3, dry: 2 },
  'q5_b': { bold: 3, bitter: 1 },
  'q5_c': { bold: 2, complex: 2, carbonated: 1 },
  'q5_d': { light: 3, dry: 1 },
};

const ANSWER_MAP: Record<keyof OnboardingAnswers, string> = {
  drink: 'q1', moment: 'q2', flavour: 'q3', texture: 'q4', goal: 'q5',
};

function applyAnswerScores(answers: OnboardingAnswers, scores: Record<string, number>): void {
  for (const [key, prefix] of Object.entries(ANSWER_MAP)) {
    const answer = answers[key as keyof OnboardingAnswers];
    if (!answer) continue;
    const contribution = ANSWER_SCORES[`${prefix}_${answer}`];
    if (!contribution) continue;
    for (const [dim, pts] of Object.entries(contribution)) {
      scores[dim] = (scores[dim] ?? 0) + (pts as number);
    }
  }
}

// ── Archetype calculation ─────────────────────────────────────────

export function calculateArchetype(answers: OnboardingAnswers): ArchetypeId {
  const scores: Record<string, number> = {
    bitter: 0, carbonated: 0, complex: 0, dry: 0, bold: 0, light: 0,
  };
  applyAnswerScores(answers, scores);
  const tiebreak: ArchetypeId[] = ['complex', 'bold', 'carbonated', 'dry', 'light', 'bitter'];
  let best: ArchetypeId = 'complex';
  for (const dim of tiebreak) {
    if ((scores[dim] ?? 0) > (scores[best] ?? 0)) best = dim;
  }
  return best;
}

// ── Confidence calculation ────────────────────────────────────────

function calculateConfidence(rawScores: Record<string, number>): number {
  const all = Object.entries(rawScores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (all.length === 0) return 70;
  const top = all[0][1];
  const second = all[1]?.[1] ?? 0;
  const gap = top - second;
  const maxGap = 20;
  const confidence = 70 + ((gap / maxGap) * 28);
  return Math.round(Math.min(98, Math.max(70, confidence)));
}

// ── Raw dimension scores (all 10 flavor tags, 0-based raw) ────────

function computeDimensionScores(answers: OnboardingAnswers): Record<string, number> {
  const scores: Record<string, number> = {
    bitter: 0, carbonated: 0, complex: 0, dry: 0, bold: 0, light: 0,
    herbal: 0, citrus: 0, dark_fruit: 0, clean: 0,
  };
  applyAnswerScores(answers, scores);
  return scores;
}

// ── Convert onboarding answers → full taste vector (0-10) ─────────

export function onboardingToTasteVector(
  answers: OnboardingAnswers,
  archetypeId: ArchetypeId,
): {
  vector: UserTasteVector;
  archetypeId: ArchetypeId;
  archetypeName: string;
  confidence: number;
} {
  const raw = computeDimensionScores(answers);
  const maxRaw = Math.max(...Object.values(raw), 1);
  const norm = (v: number) => Math.round((v / maxRaw) * 10);

  const archetype = ARCHETYPES[archetypeId];
  const pf = archetype.primaryFlavours;

  const sweetness = norm(raw.light ?? 0);
  const bitterness = norm(raw.bitter ?? 0);
  const acidity = norm(raw.dry ?? 0);
  const body = norm(((raw.bold ?? 0) + (raw.complex ?? 0)) / 2);
  const complexity = norm(raw.complex ?? 0);
  const carbonation = norm(raw.carbonated ?? 0);

  return {
    vector: {
      sweetness: Math.min(10, sweetness),
      bitterness: Math.min(10, bitterness),
      acidity: Math.min(10, acidity),
      body: Math.min(10, body),
      complexity: Math.min(10, complexity),
      carbonation: Math.min(10, carbonation),
      favoriteFlavorTags: pf,
      avoidedFlavorTags: [],
      preferredCategories: archetype.categories,
    },
    archetypeId,
    archetypeName: archetype.name,
    confidence: calculateConfidence(raw),
  };
}
