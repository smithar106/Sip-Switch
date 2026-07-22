import { supabase, isSupabaseConfigured } from './supabase';
import type { SupabaseDrink, SupabaseTasteProfile, SupabaseDrinkRating } from '../types/supabase';
import { enqueueMutation, processSyncQueue } from './syncQueue';
import { entityKeyForRating, entityKeyForTasteProfile } from './mutationTypes';

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

// ── Taste Profiles (local-first with sync queue) ──────────────────

export async function fetchTasteProfile(userId: string): Promise<SupabaseTasteProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase!
      .from('taste_profiles')
      .select('*')
      .eq('user_id', userId)
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
  if (!userId) return false;

  // Optimistic local completion
  const profileOk = true;

  // Enqueue for remote sync
  if (isSupabaseConfigured()) {
    await enqueueMutation(
      userId,
      'upsert_taste_profile',
      entityKeyForTasteProfile(userId),
      {
        archetype_id: profile.archetype_id,
        archetype_name: profile.archetype_name,
        confidence_score: profile.confidence_score,
        sweetness_preference: profile.sweetness_preference,
        bitterness_preference: profile.bitterness_preference,
        acidity_preference: profile.acidity_preference,
        body_preference: profile.body_preference,
        complexity_preference: profile.complexity_preference,
        carbonation_preference: profile.carbonation_preference,
        preferred_categories: profile.preferred_categories,
        favorite_flavor_tags: profile.favorite_flavor_tags,
        avoided_flavor_tags: profile.avoided_flavor_tags,
        onboarding_answers: profile.onboarding_answers,
        total_ratings: profile.total_ratings,
      },
    );
    // Fire-and-forget background sync
    processSyncQueue().catch(() => {});
  }

  return profileOk;
}

// ── Drink Ratings (local-first with sync queue) ───────────────────

export async function saveDrinkRating(
  userId: string | null,
  drinkId: string,
  rating: 'love' | 'like' | 'skip',
  feedbackTags?: string[],
): Promise<boolean> {
  if (!userId) return false;

  // Optimistic local completion
  const ratingOk = true;

  // Enqueue for remote sync
  if (isSupabaseConfigured()) {
    await enqueueMutation(
      userId,
      'upsert_drink_rating',
      entityKeyForRating(userId, drinkId),
      { drinkId, rating, feedbackTags },
    );
    // Fire-and-forget background sync
    processSyncQueue().catch(() => {});
  }

  return ratingOk;
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
