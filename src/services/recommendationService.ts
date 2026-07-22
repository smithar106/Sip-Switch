import { scoreDrinks, rankDrinksForFeed, type ExplorationConfig } from '../utils/recommendationEngine';
import { getActiveCatalog, getCatalogState } from '../repositories/drinkCatalog';
import type { SupabaseDrink, UserTasteVector, ScoredRecommendation } from '../types/supabase';
import type { DrinkProfile } from '../types';
import { supabaseDrinksToDrinkProfiles } from '../utils/drinkAdapter';
import { useTasteStore } from '../stores/tasteStore';

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

function getDimensionConfidence(): Record<string, number> | undefined {
  try {
    const model = useTasteStore.getState().model;
    if (!model) return undefined;

    const dims: Record<string, number> = {};
    for (const [dim, evidence] of Object.entries(model.dimensionConfidence)) {
      const conf = 1 - Math.exp(-evidence.weightedEvidence / 3);
      const consistency = evidence.variance > 0 ? Math.max(0.5, 1 - evidence.variance / 10) : 1;
      dims[dim] = Math.max(0.3, Math.min(1.0, conf * consistency));
    }
    return dims;
  } catch {
    return undefined;
  }
}

const EXPLORATION_CONFIG: ExplorationConfig = {
  enabled: true,
  explorationSlotIndex: 2,
  lowConfidenceThreshold: 0.5,
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

  const dimConfidence = getDimensionConfidence();
  const scored = rankDrinksForFeed(catalog, userTaste, ratedDrinkIds, dimConfidence);
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

  const dimConfidence = getDimensionConfidence();
  const scored = scoreDrinks(catalog, userTaste, context, ratedDrinkIds, dimConfidence, EXPLORATION_CONFIG);
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

// ── Confidence helpers for UI ─────────────────────────────────────

export function getConfidenceLabel(overallConfidence: number): {
  label: string;
  showLabel: boolean;
} {
  if (overallConfidence < 30) {
    return { label: 'Still learning your taste', showLabel: true };
  }
  if (overallConfidence < 60) {
    return { label: 'Getting to know you', showLabel: true };
  }
  if (overallConfidence < 85) {
    return { label: 'Understanding your preferences', showLabel: true };
  }
  return { label: '', showLabel: false };
}
