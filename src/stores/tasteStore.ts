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

const DEFAULT_PROFILE: TasteProfile = {
  archetypeId: null,
  scores: { bitter: 0, carbonated: 0, complex: 0, dry: 0, bold: 0, light: 0 },
  dominantFlavours: [],
  totalRatings: 0,
  lastUpdated: null,
};

function safeSet(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch(() => {});
}

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

    const profile = {
      ...get().profile,
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
    const profile = { ...get().profile, archetypeId: id, dominantFlavours: flavours };
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
