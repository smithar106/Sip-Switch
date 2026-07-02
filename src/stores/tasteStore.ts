import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrinkRating, TasteProfile, ArchetypeId, FlavourTag } from '../types';
import { ARCHETYPES } from '../constants/archetypes';

interface TasteState {
  profile: TasteProfile;
  ratings: DrinkRating[];
  addRating: (rating: DrinkRating) => void;
  updateArchetype: (id: ArchetypeId) => void;
  loadFromStorage: () => Promise<void>;
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
  scores: neutralScores(), // WIRING_TEST_MARKER
  dominantFlavours: [],
  totalRatings: 0,
  lastUpdated: null,
};

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch(() => {});
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

const RATING_WEIGHTS: Record<string, number> = {
  love: 6,
  like: 3,
  skip: -3,
};

export const useTasteStore = create<TasteState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  ratings: [],
  addRating: (rating) => {
    const existing = get().ratings;
    const alreadyRated = existing.findIndex(r => r.drinkId === rating.drinkId);

    let ratings: DrinkRating[];
    if (alreadyRated >= 0) {
      ratings = existing.map((r, i) => i === alreadyRated ? rating : r);
    } else {
      ratings = [...existing, rating];
    }

    const scores = { ...get().profile.scores };
    const weight = RATING_WEIGHTS[rating.rating] ?? 0;
    if (rating.flavourTags && weight !== 0) {
      for (const tag of rating.flavourTags) {
        if (tag in scores) {
          scores[tag] = clamp((scores[tag] ?? 50) + weight);
        }
      }
    }

    const profile = {
      ...get().profile,
      scores,
      totalRatings: ratings.filter(r => r.rating === 'love' || r.rating === 'like').length,
      lastUpdated: new Date().toISOString()
    };
    set({ ratings, profile });
    safeSet('@ss_ratings', JSON.stringify(ratings));
    safeSet('@ss_profile', JSON.stringify(profile));
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
    set({ profile });
    safeSet('@ss_profile', JSON.stringify(profile));
  },
  loadFromStorage: async () => {
    try {
      const [ratingsRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem('@ss_ratings'),
        AsyncStorage.getItem('@ss_profile'),
      ]);
      const ratings: DrinkRating[] = ratingsRaw ? JSON.parse(ratingsRaw) : [];
      const profile: TasteProfile = profileRaw ? JSON.parse(profileRaw) : DEFAULT_PROFILE;
      profile.totalRatings = ratings.filter(r => r.rating === 'love' || r.rating === 'like').length;
      set({ ratings, profile });
    } catch {
      // Corrupted storage — use defaults
    }
  },
}));
