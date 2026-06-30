import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LiveEntry } from '../types/liveTypes';

interface LiveState {
  history: LiveEntry[];
  streak: number;
  lastEntryDate: string | null;
  addEntry: (entry: LiveEntry) => void;
  rateEntry: (id: string, rating: LiveEntry['rating']) => void;
  loadFromStorage: () => Promise<void>;
}

function calculateStreak(history: LiveEntry[]): number {
  if (history.length === 0) return 0;

  const dates = [...new Set(
    history.map(e => e.timestamp.slice(0, 10))
  )].sort().reverse();

  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const date of dates) {
    const d = new Date(date);
    const diff = Math.floor((current.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) {
      streak++;
      current = d;
    } else {
      break;
    }
  }
  return streak;
}

export const useLiveStore = create<LiveState>((set, get) => ({
  history: [],
  streak: 0,
  lastEntryDate: null,
  addEntry: (entry) => {
    const history = [entry, ...get().history];
    const streak = calculateStreak(history);
    const lastEntryDate = entry.timestamp.slice(0, 10);
    set({ history, streak, lastEntryDate });
    AsyncStorage.setItem('@ss_live_history', JSON.stringify(history));
    AsyncStorage.setItem('@ss_live_streak', JSON.stringify(streak));
    AsyncStorage.setItem('@ss_live_last', lastEntryDate);
  },
  rateEntry: (id, rating) => {
    const history = get().history.map(e => e.id === id ? { ...e, rating } : e);
    set({ history });
    AsyncStorage.setItem('@ss_live_history', JSON.stringify(history));
  },
  loadFromStorage: async () => {
    const [historyRaw, streakRaw, lastDate] = await Promise.all([
      AsyncStorage.getItem('@ss_live_history'),
      AsyncStorage.getItem('@ss_live_streak'),
      AsyncStorage.getItem('@ss_live_last'),
    ]);
    set({
      history: historyRaw ? JSON.parse(historyRaw) : [],
      streak: streakRaw ? JSON.parse(streakRaw) : 0,
      lastEntryDate: lastDate,
    });
  },
}));
