import type { DrinkCategory, FlavourTag, ArchetypeId } from './index';

export interface SupabaseDrink {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  image_url: string | null;
  product_url: string | null;
  price_range: string | null;
  availability_regions: string[] | null;
  sweetness_score: number | null;
  bitterness_score: number | null;
  acidity_score: number | null;
  body_score: number | null;
  complexity_score: number | null;
  carbonation_score: number | null;
  flavor_tags: string[] | null;
  occasion_tags: string[] | null;
  food_pairing_tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTasteProfile {
  id: string;
  user_id: string | null;
  archetype_id: string | null;
  archetype_name: string | null;
  confidence_score: number | null;
  sweetness_preference: number | null;
  bitterness_preference: number | null;
  acidity_preference: number | null;
  body_preference: number | null;
  complexity_preference: number | null;
  carbonation_preference: number | null;
  preferred_categories: string[] | null;
  favorite_flavor_tags: string[] | null;
  avoided_flavor_tags: string[] | null;
  onboarding_answers: Record<string, string> | null;
  total_ratings: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseDrinkRating {
  id: string;
  user_id: string | null;
  drink_id: string;
  rating: 'love' | 'like' | 'skip';
  feedback_tags: string[] | null;
  created_at: string;
}

export interface RecommendationSession {
  id: string;
  user_id: string | null;
  taste_profile_id: string | null;
  context: string | null;
  recommended_drink_ids: string[];
  scores: Record<string, number> | null;
  created_at: string;
}

export interface DrinkVector {
  sweetness: number;
  bitterness: number;
  acidity: number;
  body: number;
  complexity: number;
  carbonation: number;
  flavorTags: string[];
  occasionTags: string[];
  category: string;
}

export interface UserTasteVector {
  sweetness: number;
  bitterness: number;
  acidity: number;
  body: number;
  complexity: number;
  carbonation: number;
  favoriteFlavorTags: string[];
  avoidedFlavorTags: string[];
  preferredCategories: string[];
}

export interface ScoredRecommendation {
  drinkId: string;
  score: number;
  reason: string;
}
