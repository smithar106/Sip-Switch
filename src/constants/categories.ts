// ── Category fallbacks for sparse catalogs ─────────────────────────
//
// When a user's preferred category has fewer than SPARSE_THRESHOLD
// active drinks, the recommendation engine broadens to adjacent
// fallback categories with partial score credit.
//
// Add new categories and their fallbacks here — no engine changes needed.
// The engine computes category counts dynamically from the drinks array.

export const SPARSE_THRESHOLD = 10;

export const CATEGORY_FALLBACKS: Record<string, string[]> = {
  Beer: ['Hop Water', 'Functional Drink', 'RTD Mocktail'],
  Wine: ['Sparkling', 'Aperitif', 'RTD Mocktail'],
  Spirit: ['Aperitif', 'Mixer', 'RTD Mocktail'],
  Aperitif: ['Sparkling', 'RTD Mocktail'],
  Mixer: ['RTD Mocktail', 'Functional Drink'],
};

export const FALLBACK_SCORE = 0.5;
