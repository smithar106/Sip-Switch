import { scoreDrinks, rankDrinksForFeed } from '../utils/recommendationEngine';
import { getActiveCatalog, getCatalogState } from '../repositories/drinkCatalog';
import type { SupabaseDrink, UserTasteVector, ScoredRecommendation } from '../types/supabase';
import type { DrinkProfile } from '../types';
import { supabaseDrinksToDrinkProfiles } from '../utils/drinkAdapter';

export interface RecommendationContext {
  occasion?: string;
  category?: string;
}

export interface RecommendationResult {
  drinks: DrinkProfile[];
  scored: ScoredRecommendation[];
  loading: boolean;
  error: string | null;
  catalogSize: number;
}

const EMPTY_RESULT: RecommendationResult = {
  drinks: [],
  scored: [],
  loading: false,
  error: null,
  catalogSize: 0,
};

// ── Feed recommendations ──────────────────────────────────────────

export async function getFeedRecommendations(
  userTaste: UserTasteVector,
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): Promise<RecommendationResult> {
  const catalog = await getActiveCatalog();
  const catState = getCatalogState();

  if (catalog.length === 0 && catState.error) {
    return {
      ...EMPTY_RESULT,
      loading: catState.loading,
      error: catState.error,
    };
  }

  if (catalog.length === 0) {
    return {
      ...EMPTY_RESULT,
      loading: catState.loading,
      error: catState.loading ? null : 'No drinks available yet',
    };
  }

  const scored = rankDrinksForFeed(catalog, userTaste, ratedDrinkIds);
  const scoreMap = new Map(scored.map((r) => [r.drinkId, { score: r.score, reason: r.reason }]));
  const drinks = supabaseDrinksToDrinkProfiles(catalog, scoreMap);

  return {
    drinks,
    scored,
    loading: catState.loading,
    error: null,
    catalogSize: catalog.length,
  };
}

// ── Live (occasion-based) recommendations ─────────────────────────

export async function getLiveRecommendation(
  userTaste: UserTasteVector,
  context: RecommendationContext,
  ratedDrinkIds?: Map<string, 'love' | 'like' | 'skip'>,
): Promise<{
  drink: DrinkProfile | null;
  scored: ScoredRecommendation | null;
  loading: boolean;
  error: string | null;
}> {
  const catalog = await getActiveCatalog();
  const catState = getCatalogState();

  if (catalog.length === 0) {
    return {
      drink: null,
      scored: null,
      loading: catState.loading,
      error: catState.error ?? 'No drinks available yet',
    };
  }

  const scored = scoreDrinks(catalog, userTaste, context, ratedDrinkIds);
  const top = scored[0];

  if (!top || top.score <= 0) {
    return {
      drink: null,
      scored: null,
      loading: false,
      error: 'No matching recommendations available',
    };
  }

  const scoreMap = new Map([[top.drinkId, { score: top.score, reason: top.reason }]]);
  const drinks = supabaseDrinksToDrinkProfiles(catalog, scoreMap);

  return {
    drink: drinks[0] ?? null,
    scored: top,
    loading: false,
    error: null,
  };
}
