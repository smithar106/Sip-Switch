import { supabase, isSupabaseConfigured } from './supabase';
import type { SupabaseDrink, SupabaseTasteProfile, SupabaseDrinkRating } from '../types/supabase';
import { useTasteStore } from '../stores/tasteStore';

// ── Drinks ────────────────────────────────────────────────────────

export async function fetchActiveDrinks(): Promise<SupabaseDrink[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase!
      .from('drinks')
      .select('*')
      .eq('is_active', true);
    if (error) {
      console.error('[drinks] fetchActiveDrinks failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[drinks] fetchActiveDrinks error:', err);
    return [];
  }
}

export async function fetchDrinksByCategory(category: string): Promise<SupabaseDrink[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase!
      .from('drinks')
      .select('*')
      .eq('is_active', true)
      .eq('category', category);
    if (error) {
      console.error('[drinks] fetchDrinksByCategory failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[drinks] fetchDrinksByCategory error:', err);
    return [];
  }
}

export async function fetchDrinksByOccasion(occasion: string): Promise<SupabaseDrink[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase!
      .from('drinks')
      .select('*')
      .eq('is_active', true)
      .contains('occasion_tags', [occasion]);
    if (error) {
      console.error('[drinks] fetchDrinksByOccasion failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[drinks] fetchDrinksByOccasion error:', err);
    return [];
  }
}

export async function fetchDrinkById(id: string): Promise<SupabaseDrink | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase!
      .from('drinks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('[drinks] fetchDrinkById failed:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[drinks] fetchDrinkById error:', err);
    return null;
  }
}

export async function searchDrinks(query: string): Promise<SupabaseDrink[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];
  try {
    const { data, error } = await supabase!
      .from('drinks')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${query.trim()}%`);
    if (error) {
      console.error('[drinks] searchDrinks failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[drinks] searchDrinks error:', err);
    return [];
  }
}

// ── Taste Profiles ────────────────────────────────────────────────

export async function fetchTasteProfile(userId: string): Promise<SupabaseTasteProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase!
      .from('taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[drinks] fetchTasteProfile failed:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[drinks] fetchTasteProfile error:', err);
    return null;
  }
}

export async function saveTasteProfile(
  userId: string | null,
  profile: Partial<SupabaseTasteProfile>,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (!userId) return false;
  try {
    const { error } = await supabase!
      .from('taste_profiles')
      .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() });
    if (error) {
      console.error('[drinks] saveTasteProfile failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[drinks] saveTasteProfile error:', err);
    return false;
  }
}

// ── Drink Ratings ─────────────────────────────────────────────────

export async function saveDrinkRating(
  userId: string | null,
  drinkId: string,
  rating: 'love' | 'like' | 'skip',
  feedbackTags?: string[],
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (!userId) return false;
  try {
    const { error } = await supabase!
      .from('drink_ratings')
      .upsert({
        user_id: userId,
        drink_id: drinkId,
        rating,
        feedback_tags: feedbackTags ?? null,
      }, { onConflict: 'user_id, drink_id' });
    if (error) {
      console.error('[drinks] saveDrinkRating failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[drinks] saveDrinkRating error:', err);
    return false;
  }
}

export async function fetchDrinkRatings(userId: string): Promise<SupabaseDrinkRating[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase!
      .from('drink_ratings')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('[drinks] fetchDrinkRatings failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[drinks] fetchDrinkRatings error:', err);
    return [];
  }
}

// ── Local fallback helpers ────────────────────────────────────────

export function isLocalRating(
  drinkId: string,
  localRatings: { drinkId: string; rating: string }[],
): { rated: boolean; rating?: string } {
  const found = localRatings.find((r) => r.drinkId === drinkId);
  return found ? { rated: true, rating: found.rating } : { rated: false };
}


