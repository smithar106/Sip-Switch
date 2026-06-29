import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrinkRating, TasteProfile, ArchetypeId } from '../types';

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

export const useTasteStore = create<TasteState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  ratings: [],
  addRating: (rating) => {
    const ratings = [...get().ratings, rating];
    const profile = { ...get().profile, totalRatings: ratings.length, lastUpdated: new Date().toISOString() };
    set({ ratings, profile });
    AsyncStorage.setItem('@ss_ratings', JSON.stringify(ratings));
    AsyncStorage.setItem('@ss_profile', JSON.stringify(profile));
  },
  updateArchetype: (id) => {
    const profile = { ...get().profile, archetypeId: id };
    set({ profile });
    AsyncStorage.setItem('@ss_profile', JSON.stringify(profile));
  },
  loadFromStorage: async () => {
    const [ratingsRaw, profileRaw] = await Promise.all([
      AsyncStorage.getItem('@ss_ratings'),
      AsyncStorage.getItem('@ss_profile'),
    ]);
    set({
      ratings: ratingsRaw ? JSON.parse(ratingsRaw) : [],
      profile: profileRaw ? JSON.parse(profileRaw) : DEFAULT_PROFILE,
    });
  },
}));
