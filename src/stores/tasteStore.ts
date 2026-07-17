import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrinkRating, TasteProfile, ArchetypeId, FlavourTag } from '../types';
import type { UserTasteVector } from '../types/supabase';
import { ARCHETYPES } from '../constants/archetypes';

// ── Taste vector stored alongside the legacy profile ──────────────

interface TasteVectorState {
  sweetness: number;
  bitterness: number;
  acidity: number;
  body: number;
  complexity: number;
  carbonation: number;
}

interface TasteState {
  profile: TasteProfile;
  ratings: DrinkRating[];
  vector: TasteVectorState;
  favoriteFlavorTags: string[];
  avoidedFlavorTags: string[];
  confidence: number;

  addRating: (rating: DrinkRating) => void;
  updateArchetype: (id: ArchetypeId) => void;
  setTasteVector: (v: Partial<TasteVectorState>, tags?: string[], confidence?: number) => void;
  loadFromStorage: () => Promise<void>;
  getRatedDrinkIds: () => Map<string, 'love' | 'like' | 'skip'>;
  getDrinkRating: (drinkId: string) => DrinkRating | undefined;
  getUserTasteVector: () => UserTasteVector;
}

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

const DEFAULT_VECTOR: TasteVectorState = {
  sweetness: 5, bitterness: 5, acidity: 5, body: 5, complexity: 5, carbonation: 5,
};

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch((err) => console.error('[tasteStore] write error:', err));
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(10, v));
}

// ── Rating update weights (gradual) ───────────────────────────────

const MOVE_TOWARD = { love: 0.20, like: 0.08, skip: -0.10 };

export const useTasteStore = create<TasteState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  ratings: [],
  vector: DEFAULT_VECTOR,
  favoriteFlavorTags: [],
  avoidedFlavorTags: [],
  confidence: 70,

  setTasteVector: (v, tags, confidence) => {
    const vector = { ...get().vector, ...v };
    set({
      vector,
      favoriteFlavorTags: tags ?? get().favoriteFlavorTags,
      confidence: confidence ?? get().confidence,
    });
    AsyncStorage.setItem('@ss_taste_vector', JSON.stringify(vector)).catch(() => {});
    if (tags) {
      AsyncStorage.setItem('@ss_favorite_tags', JSON.stringify(tags)).catch(() => {});
    }
    if (confidence !== undefined) {
      AsyncStorage.setItem('@ss_confidence', JSON.stringify(confidence)).catch(() => {});
    }
  },

  addRating: (rating) => {
    const existing = get().ratings;
    const alreadyRated = existing.findIndex(r => r.drinkId === rating.drinkId);

    let ratings: DrinkRating[];
    if (alreadyRated >= 0) {
      ratings = existing.map((r, i) => i === alreadyRated ? rating : r);
    } else {
      ratings = [...existing, rating];
    }

    // Legacy flavor scores update (for profile meter display)
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

    // Gradual taste vector update
    const vector = { ...get().vector };
    const drinkFlavorTags = rating.flavourTags ?? [];
    const direction = MOVE_TOWARD[rating.rating as 'love' | 'like' | 'skip'] ?? 0;

    // Map drink flavor tags to vector movement
    const tagToDim: Record<string, keyof TasteVectorState> = {
      bitter: 'bitterness', carbonated: 'carbonation', complex: 'complexity',
      dry: 'acidity', bold: 'body', light: 'sweetness',
    };
    for (const tag of drinkFlavorTags) {
      const dim = tagToDim[tag];
      if (dim && direction !== 0) {
        vector[dim] = clamp01(vector[dim] + direction * 10);
      }
    }

    // Avoided tags tracking
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

    set({ ratings, profile, vector, avoidedFlavorTags: avoided, favoriteFlavorTags: favorite });
    safeSet('@ss_ratings', JSON.stringify(ratings));
    safeSet('@ss_profile', JSON.stringify(profile));
    safeSet('@ss_taste_vector', JSON.stringify(vector));
    safeSet('@ss_avoided_tags', JSON.stringify(avoided));
    safeSet('@ss_favorite_tags', JSON.stringify(favorite));
  },

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
    set({ profile, favoriteFlavorTags: flavours });
    safeSet('@ss_profile', JSON.stringify(profile));
    safeSet('@ss_favorite_tags', JSON.stringify(flavours));
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
    return {
      sweetness: s.vector.sweetness,
      bitterness: s.vector.bitterness,
      acidity: s.vector.acidity,
      body: s.vector.body,
      complexity: s.vector.complexity,
      carbonation: s.vector.carbonation,
      favoriteFlavorTags: s.favoriteFlavorTags,
      avoidedFlavorTags: s.avoidedFlavorTags,
      preferredCategories: s.profile.archetypeId
        ? ARCHETYPES[s.profile.archetypeId]?.categories
        : [],
    };
  },

  loadFromStorage: async () => {
    try {
      const [ratingsRaw, profileRaw, vectorRaw, favoriteRaw, avoidedRaw, confidenceRaw] =
        await Promise.all([
          AsyncStorage.getItem('@ss_ratings'),
          AsyncStorage.getItem('@ss_profile'),
          AsyncStorage.getItem('@ss_taste_vector'),
          AsyncStorage.getItem('@ss_favorite_tags'),
          AsyncStorage.getItem('@ss_avoided_tags'),
          AsyncStorage.getItem('@ss_confidence'),
        ]);
      const ratings: DrinkRating[] = ratingsRaw ? JSON.parse(ratingsRaw) : [];
      const profile: TasteProfile = profileRaw ? JSON.parse(profileRaw) : DEFAULT_PROFILE;
      const vector: TasteVectorState = vectorRaw ? JSON.parse(vectorRaw) : DEFAULT_VECTOR;
      const favoriteFlavorTags: FlavourTag[] = favoriteRaw ? JSON.parse(favoriteRaw) : [];
      const avoidedFlavorTags: FlavourTag[] = avoidedRaw ? JSON.parse(avoidedRaw) : [];
      const confidence: number = confidenceRaw ? JSON.parse(confidenceRaw) : 70;

      profile.totalRatings = ratings.filter(r => r.rating === 'love' || r.rating === 'like').length;
      set({ ratings, profile, vector, favoriteFlavorTags, avoidedFlavorTags, confidence });
    } catch (err) {
      console.error('[tasteStore] load error:', err);
    }
  },
}));
