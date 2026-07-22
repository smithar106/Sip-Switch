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

export type RecommendationType = 'exploit' | 'explore';

export interface ScoredRecommendationWithMeta extends ScoredRecommendation {
  recommendationType: RecommendationType;
  rawScore: number;
}

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

// ── Distance-based similarity with confidence weighting ───────────

function tasteSimilarity(
  user: number[],
  drink: number[],
  dimensionWeights?: number[],
): number {
  let totalWeight = 0;
  let weightedDistSq = 0;

  for (let i = 0; i < user.length; i++) {
    const diff = user[i] - drink[i];
    const w = dimensionWeights?.[i] ?? 1;
    weightedDistSq += diff * diff * w;
    totalWeight += w;
  }

  const effectiveWeight = totalWeight > 0 ? totalWeight / user.length : 1;
  const maxDist = 10 * Math.sqrt(user.length);
  return 1 - (Math.sqrt(weightedDistSq / effectiveWeight) / maxDist);
}

// ── Tag overlap ratio ─────────────────────────────────────────────

function tagOverlap(userTags: string[], drinkTags: string[] | null): number {
  if (!drinkTags || drinkTags.length === 0 || userTags.length === 0) return 0;
  const matches = userTags.filter((t) => drinkTags.includes(t)).length;
  return matches / Math.max(userTags.length, drinkTags.length);
}

// ── Confidence-based dimension weights ────────────────────────────

export function computeDimensionWeights(
  dimensionConfidence?: Record<string, number>,
): number[] {
  if (!dimensionConfidence) return [1, 1, 1, 1, 1, 1];

  const dims = ['sweetness', 'bitterness', 'acidity', 'body', 'complexity', 'carbonation'];
  const weights = dims.map((d) => {
    const conf = dimensionConfidence[d] ?? 0.5;
    // Clamp to [0.3, 1.0] so no dimension is completely ignored or dominant
    return Math.max(0.3, Math.min(1.0, conf));
  });

  return weights;
}

// ── Controlled exploration ────────────────────────────────────────

export interface ExplorationConfig {
  enabled: boolean;
  explorationSlotIndex: number; // which position in the top-N to replace
  lowConfidenceThreshold: number; // dimension confidence below this triggers exploration
}

const DEFAULT_EXPLORATION: ExplorationConfig = {
  enabled: true,
  explorationSlotIndex: 2, // replace the 3rd recommendation
  lowConfidenceThreshold: 0.5,
};

export function selectExplorationCandidate(
  drinks: SupabaseDrink[],
  userTaste: UserTasteVector,
  scored: ScoredRecommendation[],
  dimensionConfidence?: Record<string, number>,
  config: ExplorationConfig = DEFAULT_EXPLORATION,
): SupabaseDrink | null {
  if (!config.enabled || drinks.length < 4) return null;

  // Find dimensions with low confidence
  if (!dimensionConfidence) return null;

  const lowConfDims = Object.entries(dimensionConfidence)
    .filter(([, conf]) => conf < config.lowConfidenceThreshold)
    .map(([dim]) => dim);

  if (lowConfDims.length === 0) return null;

  // Build set of already recommended and rated drink IDs
  const alreadyUsed = new Set(scored.slice(0, config.explorationSlotIndex + 1).map((s) => s.drinkId));
  const preferredCats = new Set(userTaste.preferredCategories);

  // Find a drink that:
  // 1. Is not already in the top recommendations
  // 2. Is in a category not fully covered by the top picks
  // 3. Has flavor tags related to low-confidence dimensions
  // 4. Has not been rated (skip would be in ratedDrinkIds, but we don't have that here)
  const topCats = new Set(
    scored.slice(0, 3).map((s) => drinks.find((d) => d.id === s.drinkId)?.category),
  );

  for (const drink of drinks) {
    if (alreadyUsed.has(drink.id)) continue;
    if (topCats.has(drink.category)) continue;
    if (!preferredCats.has(drink.category) && preferredCats.size > 0) continue;

    // Check if drink's flavor tags relate to low-confidence dimensions
    const dimTagMap: Record<string, string[]> = {
      sweetness: ['sweet', 'light'],
      bitterness: ['bitter', 'bold'],
      acidity: ['dry', 'citrus'],
      body: ['bold', 'rich'],
      complexity: ['complex', 'herbal'],
      carbonation: ['carbonated', 'sparkling'],
    };

    const hasRelevantTag = lowConfDims.some((dim) => {
      const tags = dimTagMap[dim] ?? [];
      return tags.some((t) => drink.flavor_tags?.includes(t));
    });

    if (!hasRelevantTag) continue;

    return drink;
  }

  return null;
}

// ── Main scoring function ─────────────────────────────────────────

export function scoreDrinks(
  drinks: SupabaseDrink[],
  userTaste: UserTasteVector,
  context?: { occasion?: string; category?: string },
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
  dimensionConfidence?: Record<string, number>,
  explorationConfig?: ExplorationConfig,
): ScoredRecommendationWithMeta[] {
  const uVec = userVector(userTaste);
  const dimWeights = computeDimensionWeights(dimensionConfidence);
  const categoryCounts = computeCategoryCounts(drinks);
  const { exact: exactCats, fallback: fallbackCats } = expandPreferredCategories(
    userTaste.preferredCategories, categoryCounts,
  );

  const scored = drinks.map((drink) => {
    // 1. Confidence-weighted numeric taste similarity (45%)
    const dVec = drinkVector(drink);
    const numericScore = tasteSimilarity(uVec, dVec, dimWeights);

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

  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .map((s) => ({
      drinkId: s.drinkId,
      score: Math.round(((s.score - minScore) / range) * 100),
      rawScore: s.score,
      recommendationType: 'exploit' as RecommendationType,
      reason: buildReason(s.drink, userTaste, context),
    }));

  // Controlled exploration: if enabled, replace one slot with an exploration candidate
  if (explorationConfig?.enabled && dimensionConfidence) {
    const candidate = selectExplorationCandidate(drinks, userTaste, sorted, dimensionConfidence, explorationConfig);
    if (candidate) {
      const slotIndex = Math.min(explorationConfig.explorationSlotIndex, sorted.length - 1);
      const candidateDrink = drinks.find((d) => d.id === candidate.id);
      if (candidateDrink && slotIndex > 0) {
        const dVec = drinkVector(candidateDrink);
        const numericScore = tasteSimilarity(uVec, dVec, dimWeights);
        const rawScore = numericScore * WEIGHTS.numeric;

        sorted.splice(slotIndex, 0, {
          drinkId: candidate.id,
          score: Math.round(((rawScore - minScore) / range) * 100),
          rawScore,
          recommendationType: 'explore',
          reason: `Exploring ${candidateDrink.category.toLowerCase()} — trying something new based on your evolving taste.`,
        });
        // Remove the last item to maintain list length
        sorted.pop();
      }
    }
  }

  return sorted;
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
  dimensionConfidence?: Record<string, number>,
): ScoredRecommendationWithMeta[] {
  return scoreDrinks(drinks, userTaste, undefined, ratedDrinkIds, dimensionConfidence);
}
