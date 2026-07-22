import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseDrink } from '../types/supabase';
import { fetchActiveDrinks } from '../services/drinks';

const CACHE_KEY = '@ss_drink_catalog';
const CACHE_TIMESTAMP_KEY = '@ss_drink_catalog_ts';
const CACHE_VERSION_KEY = '@ss_drink_catalog_version';
const CURRENT_CACHE_VERSION = 1;
const STALE_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface CatalogState {
  drinks: SupabaseDrink[];
  loading: boolean;
  error: string | null;
  stale: boolean;
  lastFetched: number | null;
}

let inMemoryCache: SupabaseDrink[] | null = null;
let inFlightPromise: Promise<SupabaseDrink[]> | null = null;
let state: CatalogState = {
  drinks: [],
  loading: false,
  error: null,
  stale: false,
  lastFetched: null,
};

const listeners = new Set<(state: CatalogState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribeToCatalog(listener: (state: CatalogState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

async function persistToStorage(drinks: SupabaseDrink[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(drinks)],
      [CACHE_TIMESTAMP_KEY, Date.now().toString()],
      [CACHE_VERSION_KEY, CURRENT_CACHE_VERSION.toString()],
    ]);
  } catch (err) {
    console.error('[drinkCatalog] persist error:', err);
  }
}

async function loadFromStorage(): Promise<SupabaseDrink[] | null> {
  try {
    const [raw, tsRaw, versionRaw] = await AsyncStorage.multiGet([
      CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_VERSION_KEY,
    ]);
    const version = versionRaw[1] ? parseInt(versionRaw[1], 10) : 0;
    if (version < CURRENT_CACHE_VERSION) return null;
    if (!raw[1]) return null;
    return JSON.parse(raw[1]) as SupabaseDrink[];
  } catch {
    return null;
  }
}

export async function getActiveCatalog(): Promise<SupabaseDrink[]> {
  if (inMemoryCache) return inMemoryCache;

  // Load from persistent cache first
  const cached = await loadFromStorage();
  if (cached && cached.length > 0) {
    inMemoryCache = cached;
    state = { ...state, drinks: cached, stale: true, lastFetched: Date.now() };
    notify();
  }

  // Fetch fresh data if not already in flight
  if (!inFlightPromise) {
    inFlightPromise = (async () => {
      state = { ...state, loading: true };
      notify();
      try {
        const drinks = await fetchActiveDrinks();
        if (drinks.length > 0) {
          inMemoryCache = drinks;
          await persistToStorage(drinks);
          state = {
            drinks,
            loading: false,
            error: null,
            stale: false,
            lastFetched: Date.now(),
          };
        } else if (!inMemoryCache) {
          state = {
            drinks: [],
            loading: false,
            error: 'No active drinks found',
            stale: false,
            lastFetched: Date.now(),
          };
        } else {
          state = { ...state, loading: false, stale: false };
        }
        notify();
        return drinks;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch catalog';
        if (!inMemoryCache) {
          state = { ...state, drinks: [], loading: false, error: msg, stale: false };
        } else {
          state = { ...state, loading: false, error: msg, stale: false };
        }
        notify();
        return inMemoryCache ?? [];
      } finally {
        inFlightPromise = null;
      }
    })();
  }

  return inFlightPromise;
}

export async function getCatalogByIds(ids: string[]): Promise<SupabaseDrink[]> {
  const all = await getActiveCatalog();
  const idSet = new Set(ids);
  return all.filter((d) => idSet.has(d.id));
}

export async function refreshCatalog(): Promise<SupabaseDrink[]> {
  inMemoryCache = null;
  inFlightPromise = null;
  return getActiveCatalog();
}

export async function clearCatalogCache(): Promise<void> {
  inMemoryCache = null;
  inFlightPromise = null;
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_VERSION_KEY]);
  } catch (err) {
    console.error('[drinkCatalog] clear error:', err);
  }
  state = { drinks: [], loading: false, error: null, stale: false, lastFetched: null };
  notify();
}

export function getCatalogState(): CatalogState {
  return { ...state };
}
