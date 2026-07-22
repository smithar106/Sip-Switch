import type { ArchetypeId, FlavourTag } from '../types';

export type TasteDimension = 'sweetness' | 'bitterness' | 'acidity' | 'body' | 'complexity' | 'carbonation';

export interface DimensionEvidence {
  weightedEvidence: number;
  interactionCount: number;
  variance: number;
  lastTimestamp: string | null;
}

export interface CategoryEvidence {
  positiveWeight: number;
  negativeWeight: number;
  interactionCount: number;
  lastTimestamp: string | null;
  normalizedAffinity: number; // 0.0 to 1.0
}

export interface UserTasteModel {
  archetypeId: ArchetypeId | null;
  vector: Record<TasteDimension, number>;
  categoryAffinities: Record<string, CategoryEvidence>;
  dimensionConfidence: Record<TasteDimension, DimensionEvidence>;
  favoriteFlavorTags: FlavourTag[];
  avoidedFlavorTags: FlavourTag[];
  interactionCount: number;
  modelVersion: string;
  updatedAt: string;
}

export const DEFAULT_VECTOR: Record<TasteDimension, number> = {
  sweetness: 5,
  bitterness: 5,
  acidity: 5,
  body: 5,
  complexity: 5,
  carbonation: 5,
};

export function emptyDimensionEvidence(): DimensionEvidence {
  return {
    weightedEvidence: 0,
    interactionCount: 0,
    variance: 0,
    lastTimestamp: null,
  };
}

export function emptyCategoryEvidence(): CategoryEvidence {
  return {
    positiveWeight: 0,
    negativeWeight: 0,
    interactionCount: 0,
    lastTimestamp: null,
    normalizedAffinity: 0.5,
  };
}

export const CURRENT_MODEL_VERSION = '1.0.0';

export function createDefaultModel(): UserTasteModel {
  return {
    archetypeId: null,
    vector: { ...DEFAULT_VECTOR },
    categoryAffinities: {},
    dimensionConfidence: {
      sweetness: emptyDimensionEvidence(),
      bitterness: emptyDimensionEvidence(),
      acidity: emptyDimensionEvidence(),
      body: emptyDimensionEvidence(),
      complexity: emptyDimensionEvidence(),
      carbonation: emptyDimensionEvidence(),
    },
    favoriteFlavorTags: [],
    avoidedFlavorTags: [],
    interactionCount: 0,
    modelVersion: CURRENT_MODEL_VERSION,
    updatedAt: new Date().toISOString(),
  };
}
