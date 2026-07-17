// TODO: Second catalog import needed for NA Beer, NA Wine, NA Spirit
// before broad production launch. The fallback logic (CATEGORY_FALLBACKS
// in src/constants/categories.ts) broadens sparse categories automatically.

import type { UserTasteVector, ScoredRecommendation, SupabaseDrink } from '../types/supabase';
import { SPARSE_THRESHOLD, CATEGORY_FALLBACKS, FALLBACK_SCORE } from '../constants/categories';

const WEIGHTS = {
  numeric: 0.45,
  flavorTags: 0.20,
  category: 0.15,
  occasion: 0.10,
  feedback: 0.10,
};

const AVOID_PENALTY = -0.30;
const SKIP_PENALTY = -0.50;
const LOVE_BOOST = 0.35;
const LIKE_BOOST = 0.10;

// ── Count drinks per category from the array (runtime, no hardcoding) ──

function computeCategoryCounts(drinks: SupabaseDrink[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of drinks) {
    counts[d.category] = (counts[d.category] || 0) + 1;
  }
  return counts;
}

// ── Expand preferred categories with fallbacks for sparse categories ──

function expandPreferredCategories(
  preferred: string[],
  categoryCounts: Record<string, number>,
): { exact: Set<string>; fallback: Set<string> } {
  const exact = new Set<string>();
  const fallback = new Set<string>();

  for (const cat of preferred) {
    exact.add(cat);
    const count = categoryCounts[cat] ?? 0;
    if (count < SPARSE_THRESHOLD) {
      const fb = CATEGORY_FALLBACKS[cat];
      if (fb) for (const f of fb) fallback.add(f);
    }
  }

  return { exact, fallback };
}

// ── Extract numeric vectors ───────────────────────────────────────

function drinkVector(d: SupabaseDrink): number[] {
  return [
    d.sweetness_score ?? 5,
    d.bitterness_score ?? 5,
    d.acidity_score ?? 5,
    d.body_score ?? 5,
    d.complexity_score ?? 5,
    d.carbonation_score ?? 5,
  ];
}

function userVector(u: UserTasteVector): number[] {
  return [
    u.sweetness, u.bitterness, u.acidity,
    u.body, u.complexity, u.carbonation,
  ];
}

// ── Distance-based similarity ─────────────────────────────────────

function tasteSimilarity(user: number[], drink: number[]): number {
  let distSq = 0;
  for (let i = 0; i < user.length; i++) {
    const diff = user[i] - drink[i];
    distSq += diff * diff;
  }
  const maxDist = 10 * Math.sqrt(6);
  return 1 - (Math.sqrt(distSq) / maxDist);
}

// ── Tag overlap ratio ─────────────────────────────────────────────

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
  const uVec = userVector(userTaste);
  const categoryCounts = computeCategoryCounts(drinks);
  const { exact: exactCats, fallback: fallbackCats } = expandPreferredCategories(
    userTaste.preferredCategories, categoryCounts,
  );

  const scored = drinks.map((drink) => {
    // 1. Numeric taste similarity (45%)
    const dVec = drinkVector(drink);
    const numericScore = tasteSimilarity(uVec, dVec);

    // 2. Flavor tag match (20%)
    const favTagScore = tagOverlap(userTaste.favoriteFlavorTags, drink.flavor_tags);
    const avoidOverlap = tagOverlap(userTaste.avoidedFlavorTags, drink.flavor_tags);
    const tagScore = favTagScore + (avoidOverlap * AVOID_PENALTY);

    // 3. Category preference (15%) — exact match or fallback
    let catScore = 0;
    if (exactCats.size > 0 || fallbackCats.size > 0) {
      if (exactCats.has(drink.category)) {
        catScore = 1;
      } else if (fallbackCats.has(drink.category)) {
        catScore = FALLBACK_SCORE;
      }
    }

    // 4. Occasion match (10%)
    let occScore = 0;
    if (context?.occasion && drink.occasion_tags) {
      occScore = drink.occasion_tags.includes(context.occasion) ? 1 : 0;
    }

    // 5. Feedback history (10%)
    let feedbackScore = 0;
    if (ratedDrinkIds) {
      const existing = ratedDrinkIds.get(drink.id);
      if (existing === 'skip') feedbackScore = SKIP_PENALTY;
      else if (existing === 'love') feedbackScore = LOVE_BOOST;
      else if (existing === 'like') feedbackScore = LIKE_BOOST;
    }

    const total =
      numericScore * WEIGHTS.numeric +
      tagScore * WEIGHTS.flavorTags +
      (catScore * WEIGHTS.category) +
      (occScore * WEIGHTS.occasion) +
      (feedbackScore * WEIGHTS.feedback);

    return { drinkId: drink.id, score: total, drink };
  });

  // Normalize scores to 0–100
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

// ── Reason generation ─────────────────────────────────────────────

function buildReason(
  drink: SupabaseDrink,
  userTaste: UserTasteVector,
  context?: { occasion?: string },
): string {
  const favMatches = userTaste.favoriteFlavorTags.filter(
    (t) => drink.flavor_tags?.includes(t),
  );
  if (favMatches.length >= 2) {
    return `Matches your ${favMatches.slice(0, 2).join(', ')} profile.`;
  }
  if (favMatches.length === 1) {
    return `Great match for your ${favMatches[0]} preference.`;
  }
  if (context?.occasion && drink.occasion_tags?.includes(context.occasion)) {
    const occ = context.occasion.replace(/_/g, ' ');
    return `Perfect pick for ${occ}.`;
  }
  return 'Recommended based on your taste profile.';
}

// ── Feed ranking convenience ──────────────────────────────────────

export function rankDrinksForFeed(
  drinks: SupabaseDrink[],
  userTaste: UserTasteVector,
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): ScoredRecommendation[] {
  return scoreDrinks(drinks, userTaste, undefined, ratedDrinkIds);
}
