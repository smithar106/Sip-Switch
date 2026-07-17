import type { DrinkProfile, FlavourTag } from '../types';
import type {
  SupabaseDrink,
  UserTasteVector,
  ScoredRecommendation,
} from '../types/supabase';

const FLAVOUR_TAG_WEIGHT = 0.20;
const OCCASION_WEIGHT = 0.15;
const CATEGORY_WEIGHT = 0.15;
const NUMERIC_WEIGHT = 0.50;
const AVOIDED_PENALTY = -0.25;

function extractNumericVector(drink: SupabaseDrink): number[] {
  return [
    drink.sweetness_score ?? 5,
    drink.bitterness_score ?? 5,
    drink.acidity_score ?? 5,
    drink.body_score ?? 5,
    drink.complexity_score ?? 5,
    drink.carbonation_score ?? 5,
  ];
}

function extractUserVector(user: UserTasteVector): number[] {
  return [
    user.sweetness,
    user.bitterness,
    user.acidity,
    user.body,
    user.complexity,
    user.carbonation,
  ];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function normalizeScore(raw: number, min: number, max: number): number {
  return max === min ? 0.5 : ((raw - min) / (max - min));
}

function tagOverlap(userTags: string[], drinkTags: string[] | null): number {
  if (!drinkTags || drinkTags.length === 0 || userTags.length === 0) return 0;
  const matches = userTags.filter((t) => drinkTags.includes(t)).length;
  return matches / Math.max(userTags.length, drinkTags.length);
}

// ── Main scoring function ─────────────────────────────────────────

export function scoreDrinks(
  drinks: SupabaseDrink[],
  userTaste: UserTasteVector,
  context?: { occasion?: string; category?: string },
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): ScoredRecommendation[] {
  const userVec = extractUserVector(userTaste);
  const reasons: string[] = [];

  const scored = drinks.map((drink) => {
    const drinkVec = extractNumericVector(drink);

    // Numeric similarity (50%)
    const numericSim = cosineSimilarity(userVec, drinkVec);
    const numericScore = normalizeScore(numericSim, -1, 1);

    // Favorite flavor tags overlap (20%)
    const favTagScore = tagOverlap(userTaste.favoriteFlavorTags, drink.flavor_tags);

    // Avoided flavor tags penalty
    const avoidedOverlap = tagOverlap(userTaste.avoidedFlavorTags, drink.flavor_tags);
    const avoidedScore = -avoidedOverlap * AVOIDED_PENALTY;

    // Occasion match (15%)
    let occasionScore = 0;
    if (context?.occasion && drink.occasion_tags) {
      occasionScore = drink.occasion_tags.includes(context.occasion) ? 1 : 0;
    }

    // Category preference (15%)
    let categoryScore = 0;
    if (userTaste.preferredCategories.length > 0) {
      categoryScore = userTaste.preferredCategories.includes(drink.category) ? 1 : 0;
    }

    // Rating history boost/penalty
    let ratingBoost = 0;
    if (ratedDrinkIds) {
      const existing = ratedDrinkIds.get(drink.id);
      if (existing === 'skip') ratingBoost = -0.5;
      else if (existing === 'love') ratingBoost = 0.3;
    }

    const total =
      numericScore * NUMERIC_WEIGHT +
      favTagScore * FLAVOUR_TAG_WEIGHT +
      avoidedScore +
      occasionScore * OCCASION_WEIGHT +
      categoryScore * CATEGORY_WEIGHT +
      ratingBoost;

    return { drinkId: drink.id, score: total, drink };
  });

  // Normalize scores to 0–100 for display
  const scores = scored.map((s) => s.score);
  const minScore = Math.min(...scores, -1);
  const maxScore = Math.max(...scores, 1);
  const range = maxScore - minScore || 1;

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => ({
      drinkId: s.drinkId,
      score: Math.round(((s.score - minScore) / range) * 100),
      reason: buildReason(s.drink, userTaste, context),
    }));
}

function buildReason(
  drink: SupabaseDrink,
  userTaste: UserTasteVector,
  context?: { occasion?: string },
): string {
  const favMatches = userTaste.favoriteFlavorTags.filter(
    (t) => drink.flavor_tags?.includes(t),
  );
  if (favMatches.length >= 2) {
    return `Matches your ${favMatches.slice(0, 2).join(', ')} taste profile.`;
  }
  if (favMatches.length === 1) {
    return `Aligned with your ${favMatches[0]} preference.`;
  }
  if (context?.occasion && drink.occasion_tags?.includes(context.occasion)) {
    return `Perfect for ${context.occasion.replace(/_/g, ' ')}.`;
  }
  return 'Recommended based on your taste profile.';
}

// ── Legacy adapter for moment-based lookups ───────────────────────

export function findBestDrinkForMoment(
  drinks: SupabaseDrink[],
  momentId: string,
  userTaste: UserTasteVector,
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): ScoredRecommendation | null {
  const scored = scoreDrinks(drinks, userTaste, { occasion: momentId }, ratedDrinkIds);
  return scored[0] ?? null;
}

// ── Convenience for Feed ──────────────────────────────────────────

export function rankDrinksForFeed(
  drinks: SupabaseDrink[],
  userTaste: UserTasteVector,
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): ScoredRecommendation[] {
  return scoreDrinks(drinks, userTaste, undefined, ratedDrinkIds);
}
