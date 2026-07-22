import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrinkRating, TasteProfile, ArchetypeId, FlavourTag } from '../types';
import type { UserTasteVector } from '../types/supabase';
import { ARCHETYPES } from '../constants/archetypes';
import {
  type UserTasteModel,
  type TasteDimension,
  type CategoryEvidence,
  type DimensionEvidence,
  type CategoryEvidence as CategoryEvidenceType,
  CURRENT_MODEL_VERSION,
  createDefaultModel,
  emptyDimensionEvidence,
  emptyCategoryEvidence,
  DEFAULT_VECTOR,
} from './tasteModelTypes';
import { updateCategoryAffinity, getPreferredCategories } from './categoryAffinity';

const ALL_FLAVOURS: FlavourTag[] = [
  'bitter', 'carbonated', 'complex', 'dry', 'bold', 'light',
  'herbal', 'citrus', 'dark_fruit', 'clean',
];

function neutralScores(): Record<FlavourTag, number> {
  const s: Partial<Record<FlavourTag, number>> = {};
  for (const f of ALL_FLAVOURS) s[f] = 38;
  return s as Record<FlavourTag, number>;
}

const DEFAULT_PROFILE: TasteProfile = {
  archetypeId: null,
  scores: neutralScores(),
  dominantFlavours: [],
  totalRatings: 0,
  lastUpdated: null,
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(10, v));
}

const MOVE_TOWARD = { love: 0.20, like: 0.08, skip: -0.10 };

const tagToDim: Record<string, TasteDimension> = {
  bitter: 'bitterness', carbonated: 'carbonation', complex: 'complexity',
  dry: 'acidity', bold: 'body', light: 'sweetness',
};

// ── Local storage keys ────────────────────────────────────────────

const KEYS = {
  ratings: '@ss_ratings',
  profile: '@ss_profile',
  vector: '@ss_taste_vector',
  favoriteTags: '@ss_favorite_tags',
  avoidedTags: '@ss_avoided_tags',
  confidence: '@ss_confidence',
  model: '@ss_taste_model',
};

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch((err) => console.error('[tasteStore] write error:', err));
}

// ── State interface ───────────────────────────────────────────────

interface TasteState {
  // Legacy (backward compat)
  profile: TasteProfile;
  ratings: DrinkRating[];
  confidence: number;
  favoriteFlavorTags: string[];
  avoidedFlavorTags: string[];

  // New taste model
  model: UserTasteModel;

  // ── Actions ──
  addRating: (rating: DrinkRating) => void;
  updateArchetype: (id: ArchetypeId) => void;
  setTasteVector: (v: Partial<Record<TasteDimension, number>>, tags?: string[], confidence?: number) => void;
  loadFromStorage: () => Promise<void>;
  getRatedDrinkIds: () => Map<string, 'love' | 'like' | 'skip'>;
  getDrinkRating: (drinkId: string) => DrinkRating | undefined;
  getUserTasteVector: () => UserTasteVector;
}

// ── Helpers ───────────────────────────────────────────────────────

function deriveUserTasteVector(
  model: UserTasteModel,
  profile: TasteProfile,
  favoriteFlavorTags: string[],
  avoidedFlavorTags: string[],
  categoryAffinities: Record<string, CategoryEvidence>,
): UserTasteVector {
  const allKnownCategories = Object.keys(categoryAffinities);
  const preferred = model.archetypeId
    ? [...new Set([
        ...(ARCHETYPES[model.archetypeId]?.categories ?? []),
        ...getPreferredCategories(allKnownCategories, categoryAffinities),
      ])]
    : getPreferredCategories(allKnownCategories, categoryAffinities);

  return {
    sweetness: model.vector.sweetness,
    bitterness: model.vector.bitterness,
    acidity: model.vector.acidity,
    body: model.vector.body,
    complexity: model.vector.complexity,
    carbonation: model.vector.carbonation,
    favoriteFlavorTags,
    avoidedFlavorTags,
    preferredCategories: preferred,
  };
}

function computeDimensionVariance(
  current: number,
  previous: number,
  count: number,
): number {
  if (count <= 1) return 0;
  // Simple running variance approximation
  const diff = current - previous;
  return Math.abs(diff) / count;
}

// ── Store ─────────────────────────────────────────────────────────

export const useTasteStore = create<TasteState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  ratings: [],
  confidence: 70,
  favoriteFlavorTags: [],
  avoidedFlavorTags: [],
  model: createDefaultModel(),

  // ── Add rating ──────────────────────────────────────────────────

  addRating: (rating) => {
    const existing = get().ratings;
    const alreadyRated = existing.findIndex(r => r.drinkId === rating.drinkId);

    let ratings: DrinkRating[];
    if (alreadyRated >= 0) {
      ratings = existing.map((r, i) => i === alreadyRated ? rating : r);
    } else {
      ratings = [...existing, rating];
    }

    // ── Legacy profile scores update (display only) ────────────────
    const scores = { ...get().profile.scores };
    const legacyWeights: Record<string, number> = { love: 6, like: 3, skip: -3 };
    const weight = legacyWeights[rating.rating] ?? 0;
    if (rating.flavourTags && weight !== 0) {
      for (const tag of rating.flavourTags) {
        const key = tag as keyof typeof scores;
        if (key in scores) {
          scores[key] = clamp((scores[key] ?? 50) + weight);
        }
      }
    }

    // ── Gradual taste vector update ────────────────────────────────
    const model = { ...get().model };
    const vector = { ...model.vector };
    const drinkFlavorTags = rating.flavourTags ?? [];
    const direction = MOVE_TOWARD[rating.rating as 'love' | 'like' | 'skip'] ?? 0;

    for (const tag of drinkFlavorTags) {
      const dim = tagToDim[tag];
      if (dim && direction !== 0) {
        const oldVal = vector[dim];
        vector[dim] = clamp01(vector[dim] + direction * 10);

        // Update dimension evidence
        const evidence = { ...model.dimensionConfidence[dim] };
        const newCount = evidence.interactionCount + 1;
        const newEvidence = evidence.weightedEvidence + Math.abs(direction);
        const variance = computeDimensionVariance(vector[dim], oldVal, newCount);

        model.dimensionConfidence[dim] = {
          weightedEvidence: newEvidence,
          interactionCount: newCount,
          variance: Math.max(evidence.variance, variance),
          lastTimestamp: rating.timestamp,
        };
      }

    }

    // ── Category affinity update ──────────────────────────────────
    // Uses rating.category when provided by the caller (Feed/Live screens)
    const categoryAffinities = { ...model.categoryAffinities };
    if (rating.category) {
      const existing = categoryAffinities[rating.category] ?? emptyCategoryEvidence();
      categoryAffinities[rating.category] = updateCategoryAffinity(
        existing,
        rating.rating as 'love' | 'like' | 'skip',
        rating.timestamp,
      );
    }

    model.vector = vector;
    model.categoryAffinities = categoryAffinities;
    model.interactionCount = ratings.filter(r => r.rating === 'love' || r.rating === 'like').length;

    // ── Avoided/favorite tags ─────────────────────────────────────
    const avoided = [...get().avoidedFlavorTags];
    const favorite = [...get().favoriteFlavorTags];
    if (rating.rating === 'skip') {
      for (const tag of drinkFlavorTags) {
        if (!avoided.includes(tag)) avoided.push(tag);
        const favIdx = favorite.indexOf(tag);
        if (favIdx >= 0) favorite.splice(favIdx, 1);
      }
    }

    const totalRatings = ratings.filter(r => r.rating === 'love' || r.rating === 'like').length;
    const profile = {
      ...get().profile,
      scores,
      totalRatings,
      lastUpdated: new Date().toISOString(),
    };

    model.updatedAt = new Date().toISOString();

    set({ ratings, profile, model, confidence: computeOverallConfidence(model), avoidedFlavorTags: avoided, favoriteFlavorTags: favorite });
    safeSet(KEYS.ratings, JSON.stringify(ratings));
    safeSet(KEYS.profile, JSON.stringify(profile));
    safeSet(KEYS.vector, JSON.stringify(vector));
    safeSet(KEYS.avoidedTags, JSON.stringify(avoided));
    safeSet(KEYS.favoriteTags, JSON.stringify(favorite));
    safeSet(KEYS.model, JSON.stringify(model));
  },

  // ── Update archetype ────────────────────────────────────────────

  updateArchetype: (id) => {
    const archetype = ARCHETYPES[id];
    const flavours: FlavourTag[] = archetype ? [...archetype.primaryFlavours] : [];
    const scores = neutralScores();
    if (archetype) {
      for (const f of archetype.primaryFlavours) {
        scores[f] = clamp((scores[f] ?? 38) + 12);
      }
    }
    const profile = { ...get().profile, archetypeId: id, dominantFlavours: flavours, scores };
    const model = { ...get().model, archetypeId: id, updatedAt: new Date().toISOString() };
    set({ profile, model, favoriteFlavorTags: flavours });
    safeSet(KEYS.profile, JSON.stringify(profile));
    safeSet(KEYS.favoriteTags, JSON.stringify(flavours));
    safeSet(KEYS.model, JSON.stringify(model));
  },

  // ── Set taste vector (onboarding) ───────────────────────────────

  setTasteVector: (v, tags, confidence) => {
    const model = { ...get().model };
    const vector = { ...model.vector, ...v };
    model.vector = vector;
    model.favoriteFlavorTags = (tags ?? model.favoriteFlavorTags) as FlavourTag[];
    model.updatedAt = new Date().toISOString();
    if (confidence !== undefined) {
      set({ confidence, model });
    } else {
      set({ model });
    }
    safeSet(KEYS.vector, JSON.stringify(vector));
    if (tags) safeSet(KEYS.favoriteTags, JSON.stringify(tags));
    if (confidence !== undefined) safeSet(KEYS.confidence, JSON.stringify(confidence));
    safeSet(KEYS.model, JSON.stringify(model));
  },

  getRatedDrinkIds: () => {
    const map = new Map<string, 'love' | 'like' | 'skip'>();
    for (const r of get().ratings) {
      map.set(r.drinkId, r.rating as 'love' | 'like' | 'skip');
    }
    return map;
  },

  getDrinkRating: (drinkId: string) => {
    return get().ratings.find((r) => r.drinkId === drinkId);
  },

  getUserTasteVector: (): UserTasteVector => {
    const s = get();
    return deriveUserTasteVector(
      s.model,
      s.profile,
      s.favoriteFlavorTags,
      s.avoidedFlavorTags,
      s.model.categoryAffinities,
    );
  },

  // ── Load from storage ───────────────────────────────────────────

  loadFromStorage: async () => {
    try {
      const [ratingsRaw, profileRaw, vectorRaw, favoriteRaw, avoidedRaw, confidenceRaw, modelRaw] =
        await Promise.all([
          AsyncStorage.getItem(KEYS.ratings),
          AsyncStorage.getItem(KEYS.profile),
          AsyncStorage.getItem(KEYS.vector),
          AsyncStorage.getItem(KEYS.favoriteTags),
          AsyncStorage.getItem(KEYS.avoidedTags),
          AsyncStorage.getItem(KEYS.confidence),
          AsyncStorage.getItem(KEYS.model),
        ]);

      const ratings: DrinkRating[] = ratingsRaw ? JSON.parse(ratingsRaw) : [];
      const profile: TasteProfile = profileRaw ? JSON.parse(profileRaw) : DEFAULT_PROFILE;
      const vector: Record<TasteDimension, number> = vectorRaw
        ? JSON.parse(vectorRaw)
        : { ...DEFAULT_VECTOR };
      const favoriteFlavorTags: FlavourTag[] = favoriteRaw ? JSON.parse(favoriteRaw) : [];
      const avoidedFlavorTags: FlavourTag[] = avoidedRaw ? JSON.parse(avoidedRaw) : [];
      const rawConfidence: number = confidenceRaw ? JSON.parse(confidenceRaw) : 70;

      // Restore model from storage or build from legacy data
      let model: UserTasteModel;
      if (modelRaw) {
        model = JSON.parse(modelRaw);
        // Ensure vector is present (backward compat)
        if (!model.vector || Object.keys(model.vector).length === 0) {
          model.vector = vector as Record<TasteDimension, number>;
        }
      } else {
        // Build from legacy data
        model = createDefaultModel();
        model.vector = vector as Record<TasteDimension, number>;
        if (profile.archetypeId) {
          model.archetypeId = profile.archetypeId;
          model.favoriteFlavorTags = favoriteFlavorTags;
        }
        // Restore category affinities from legacy preferred categories if present
        if (profile.archetypeId) {
          const archetype = ARCHETYPES[profile.archetypeId];
          if (archetype) {
            for (const cat of archetype.categories) {
              model.categoryAffinities[cat] = {
                positiveWeight: 0.5,
                negativeWeight: 0,
                interactionCount: 0,
                lastTimestamp: null,
                normalizedAffinity: 0.6,
              };
            }
          }
        }
      }

      profile.totalRatings = ratings.filter(r => r.rating === 'love' || r.rating === 'like').length;

      const overallConfidence = computeOverallConfidence(model);
      set({
        ratings,
        profile,
        confidence: overallConfidence,
        favoriteFlavorTags,
        avoidedFlavorTags,
        model,
      });
    } catch (err) {
      console.error('[tasteStore] load error:', err);
    }
  },
}));

// ── Overall confidence from model ─────────────────────────────────

function computeOverallConfidence(model: UserTasteModel): number {
  const dims = Object.values(model.dimensionConfidence);
  if (dims.length === 0) return 30;

  const avgEvidence = dims.reduce((s, d) => s + d.weightedEvidence, 0) / dims.length;
  const avgConsistency = dims.reduce((s, d) => {
    const consistency = d.variance > 0 ? Math.max(0.5, 1 - d.variance / 10) : 1;
    return s + consistency;
  }, 0) / dims.length;

  const evidenceConfidence = 1 - Math.exp(-avgEvidence / 3);
  const confidence = Math.round(evidenceConfidence * avgConsistency * 100);
  return Math.max(10, Math.min(98, confidence));
}
