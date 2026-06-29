export interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    label: string;
    scores: Partial<ScoreDimensions>;
  }[];
}

export interface ScoreDimensions {
  bitter: number;
  carbonated: number;
  complex: number;
  dry: number;
  bold: number;
  light: number;
}

export interface Archetype {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  categories: string[];
  examples: string[];
}

export interface SwapEntry {
  from: string;
  to: string;
  reason: string;
}

export type Phase = "landing" | "quiz" | "capture" | "calculating" | "result";

export const QUESTIONS: Question[] = [
  {
    id: "drink",
    text: "What do you usually drink?",
    options: [
      { id: "a", label: "🍺 Beer & cider", scores: { bitter: 3, carbonated: 2 } },
      { id: "b", label: "🍷 Wine", scores: { complex: 3, dry: 2 } },
      { id: "c", label: "🍸 Cocktails & spirits", scores: { bold: 3, complex: 1 } },
      { id: "d", label: "🍹 Something light & refreshing", scores: { light: 3, carbonated: 1 } },
    ],
  },
  {
    id: "moment",
    text: "When do you most want a drink in hand?",
    options: [
      { id: "a", label: "🍽️ Dinner — it needs to pair with food", scores: { complex: 3, dry: 1 } },
      { id: "b", label: "🎉 Social occasions — something to sip", scores: { carbonated: 2, light: 2, bold: 1 } },
      { id: "c", label: "😮‍💨 Unwinding after work", scores: { bold: 2, complex: 2 } },
      { id: "d", label: "☀️ Daytime — something refreshing", scores: { light: 3, carbonated: 2 } },
    ],
  },
  {
    id: "flavour",
    text: "What flavour notes do you love?",
    options: [
      { id: "a", label: "🌿 Herbal, earthy, botanical", scores: { complex: 3, bitter: 1 } },
      { id: "b", label: "🍋 Citrus, bright, acidic", scores: { light: 2, carbonated: 2 } },
      { id: "c", label: "🍒 Rich, dark, fruity", scores: { bold: 3, dry: 1 } },
      { id: "d", label: "🫧 Clean, crisp, minimal", scores: { light: 3, dry: 2 } },
    ],
  },
  {
    id: "texture",
    text: "What does the perfect drink feel like?",
    options: [
      { id: "a", label: "🫧 Sparkling and lively", scores: { carbonated: 4 } },
      { id: "b", label: "🧊 Still and smooth", scores: { dry: 2, complex: 2 } },
      { id: "c", label: "🍯 Rich with some weight to it", scores: { bold: 3, complex: 1 } },
      { id: "d", label: "💧 Light and easy — no fuss", scores: { light: 4 } },
    ],
  },
  {
    id: "goal",
    text: "What are you looking for right now?",
    options: [
      { id: "a", label: "🧠 Something sophisticated — not just juice", scores: { complex: 3, dry: 2 } },
      { id: "b", label: "⚡ Something with a kick — adaptogens, caffeine, function", scores: { bold: 3, bitter: 1 } },
      { id: "c", label: "🎭 A real cocktail experience, zero alcohol", scores: { bold: 2, complex: 2, carbonated: 1 } },
      { id: "d", label: "🌱 Clean ingredients, nothing artificial", scores: { light: 3, dry: 1 } },
    ],
  },
];

export const ARCHETYPES: Record<string, Archetype> = {
  bitter: {
    id: "bitter",
    emoji: "🌿",
    name: "The Botanical Seeker",
    tagline: "You want depth, bitterness, and something that feels grown-up.",
    description:
      "You're not here for sweet. You want NA drinks that taste like they were crafted — bitter aperitifs, herbal tonics, complex shrubs. The kind of drink that rewards attention.",
    categories: ["NA Aperitifs", "Herbal Tonics", "Shrubs & Switchels"],
    examples: ["Ghia", "Curious Elixirs", "Pentire"],
  },
  carbonated: {
    id: "carbonated",
    emoji: "🫧",
    name: "The Sparkling Sipper",
    tagline: "Bubbles are non-negotiable. You drink with your eyes and your ears.",
    description:
      "The pop of a can, the fizz in the glass — that's half the experience for you. NA sparkling wines, craft sodas with complexity, sparkling botanicals. It has to feel celebratory.",
    categories: ["NA Sparkling Wine", "Craft Sodas", "Sparkling Botanicals"],
    examples: ["Surely", "Lyre's Classico", "Waterloo Sparkling"],
  },
  complex: {
    id: "complex",
    emoji: "🍷",
    name: "The Connoisseur",
    tagline: "You're not giving up the experience of a great drink — just the alcohol.",
    description:
      "Mouthfeel, finish, acidity, structure — you notice all of it. NA wines and spirits that are actually crafted, not just grape juice. You'll be the one converting people at dinner parties.",
    categories: ["NA Wine", "NA Spirits", "Craft Kombuchas"],
    examples: ["Leitz Eins Zwei Zero", "Seedlip", "Wild Tonic"],
  },
  dry: {
    id: "dry",
    emoji: "🧊",
    name: "The Minimalist",
    tagline: "Nothing sweet, nothing fussy. Just something clean and satisfying.",
    description:
      "You drink to complement a moment, not to make one. Dry, still, refined — NA wines with real structure, sparkling waters with a point of view, or a cold brew with intention.",
    categories: ["Dry NA Wine", "Sparkling Water", "Cold Brew"],
    examples: ["Thomson & Scott Noughty", "Alder", "Rowdy Mermaid"],
  },
  bold: {
    id: "bold",
    emoji: "🍸",
    name: "The Cocktail Purist",
    tagline: "You want the full cocktail experience — the ritual, the glass, the flavour.",
    description:
      "The drink is the event. You want NA spirits that actually mix, cocktail kits that impress, and something that looks as good as it tastes. Mocktail is a word you never use.",
    categories: ["NA Spirits", "NA Cocktail Kits", "Adaptogen Drinks"],
    examples: ["Monday Gin", "Lyre's", "Kin Euphorics"],
  },
  light: {
    id: "light",
    emoji: "☀️",
    name: "The Easy Drinker",
    tagline: "Refreshing, sessionable, and nothing that requires explanation.",
    description:
      "You want something you can reach for without thinking — at a BBQ, after a run, at a picnic. Light, clean, and genuinely satisfying. NA beer and cider territory, done right.",
    categories: ["NA Beer", "NA Cider", "Fruit Kefir"],
    examples: ["Athletic Brewing", "Partake", "Bravus"],
  },
};

export const SWAP_MAP: SwapEntry[] = [
  { from: "🍺 IPA", to: "Athletic Brewing Run Wild IPA", reason: "Same hop profile, zero alcohol" },
  { from: "🍺 Guinness", to: "Guinness 0.0", reason: "Identical — they nailed it" },
  { from: "🍷 Cabernet", to: "Leitz Eins Zwei Zero Cabernet", reason: "Tannins, structure, the works" },
  { from: "🍷 Sauvignon Blanc", to: "Thomson & Scott Noughty", reason: "Bright acidity, clean finish" },
  { from: "🍸 Negroni", to: "Lyre's Negroni Kit", reason: "Bitter, complex, ritual intact" },
  { from: "🍸 Gin & Tonic", to: "Monday Gin + Fever Tree Tonic", reason: "Botanical, refreshing, identical vibe" },
  { from: "🥂 Prosecco", to: "Surely Sparkling Rosé", reason: "Celebratory, dry, actually good" },
  { from: "🍹 Aperol Spritz", to: "Ghia + Sparkling Water", reason: "Bitter orange, aperitivo mood" },
  { from: "🥃 Whisky", to: "Lyre's American Malt", reason: "Oak, vanilla, sipping spirit" },
  { from: "🍹 Mojito", to: "Curious Elixirs No. 1", reason: "Herbaceous, citrus, complex" },
];

export function calculateArchetype(answers: Record<string, string>): Archetype {
  const scores: ScoreDimensions = {
    bitter: 0,
    carbonated: 0,
    complex: 0,
    dry: 0,
    bold: 0,
    light: 0,
  };

  for (const question of QUESTIONS) {
    const answerId = answers[question.id];
    const option = question.options.find((o) => o.id === answerId);
    if (!option) continue;
    for (const [key, value] of Object.entries(option.scores)) {
      scores[key as keyof ScoreDimensions] += value ?? 0;
    }
  }

  const tiebreak: (keyof ScoreDimensions)[] = [
    "complex",
    "bold",
    "carbonated",
    "dry",
    "light",
    "bitter",
  ];

  let best: keyof ScoreDimensions = "complex";
  for (const dim of tiebreak) {
    if (scores[dim] > scores[best]) {
      best = dim;
    }
  }

  return ARCHETYPES[best];
}
