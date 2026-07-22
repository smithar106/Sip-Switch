import { selectExplorationCandidate, computeDimensionWeights } from '../recommendationEngine';
import type { SupabaseDrink, UserTasteVector, ScoredRecommendation } from '../../types/supabase';

function makeDrink(overrides: Partial<SupabaseDrink> = {}): SupabaseDrink {
  return {
    id: 'drink-1',
    name: 'Test Drink',
    brand: 'Test Brand',
    category: 'Beer',
    subcategory: null,
    description: null,
    image_url: null,
    product_url: null,
    price_range: null,
    availability_regions: null,
    sweetness_score: 5,
    bitterness_score: 5,
    acidity_score: 5,
    body_score: 5,
    complexity_score: 5,
    carbonation_score: 5,
    flavor_tags: [],
    occasion_tags: [],
    food_pairing_tags: [],
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTaste(overrides: Partial<UserTasteVector> = {}): UserTasteVector {
  return {
    sweetness: 5,
    bitterness: 5,
    acidity: 5,
    body: 5,
    complexity: 5,
    carbonation: 5,
    favoriteFlavorTags: [],
    avoidedFlavorTags: [],
    preferredCategories: ['Beer', 'Wine'],
    ...overrides,
  };
}

describe('selectExplorationCandidate', () => {
  const baseConfig = { enabled: true, explorationSlotIndex: 2, lowConfidenceThreshold: 0.5 };

  it('returns null when disabled', () => {
    const result = selectExplorationCandidate([], makeTaste(), [], {}, { ...baseConfig, enabled: false });
    expect(result).toBeNull();
  });

  it('returns null when too few drinks', () => {
    const result = selectExplorationCandidate(
      [makeDrink({ id: 'a' }), makeDrink({ id: 'b' }), makeDrink({ id: 'c' })],
      makeTaste(), [], {},
    );
    expect(result).toBeNull();
  });

  it('returns null when no low-confidence dimensions', () => {
    const highConf = { sweetness: 0.9, bitterness: 0.9, acidity: 0.9, body: 0.9, complexity: 0.9, carbonation: 0.9 };
    const drinks = Array.from({ length: 10 }, (_, i) => makeDrink({ id: `d-${i}`, category: 'Beer', flavor_tags: ['light'] }));
    const result = selectExplorationCandidate(drinks, makeTaste(), [], highConf, baseConfig);
    expect(result).toBeNull();
  });

  it('selects a drink from a low-confidence dimension area', () => {
    const lowConf = { sweetness: 0.3, bitterness: 0.9, acidity: 0.9, body: 0.9, complexity: 0.9, carbonation: 0.9 };
    const top: ScoredRecommendation[] = [
      { drinkId: 'a', score: 90, reason: 'top' },
      { drinkId: 'b', score: 85, reason: 'second' },
      { drinkId: 'c', score: 80, reason: 'third' },
    ];
    const drinks = [
      makeDrink({ id: 'a', category: 'Beer', flavor_tags: ['bitter'] }),
      makeDrink({ id: 'b', category: 'Beer', flavor_tags: ['bitter'] }),
      makeDrink({ id: 'c', category: 'Beer', flavor_tags: ['bitter'] }),
      // exploration candidate - different category, sweet-related tags
      makeDrink({ id: 'd', category: 'Wine', flavor_tags: ['sweet', 'light'] }),
    ];
    const result = selectExplorationCandidate(drinks, makeTaste(), top, lowConf, baseConfig);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('d');
  });

  it('does not select a drink from a category already in top picks', () => {
    const lowConf = { sweetness: 0.3, bitterness: 0.9, acidity: 0.9, body: 0.9, complexity: 0.9, carbonation: 0.9 };
    const top: ScoredRecommendation[] = [
      { drinkId: 'beer-1', score: 90, reason: 'top' },
      { drinkId: 'beer-2', score: 85, reason: 'second' },
      { drinkId: 'beer-3', score: 80, reason: 'third' },
    ];
    const drinks = [
      makeDrink({ id: 'beer-1', category: 'Beer', flavor_tags: ['bitter'] }),
      makeDrink({ id: 'beer-2', category: 'Beer', flavor_tags: ['bitter'] }),
      makeDrink({ id: 'beer-3', category: 'Beer', flavor_tags: ['bitter'] }),
      makeDrink({ id: 'beer-4', category: 'Beer', flavor_tags: ['light'] }), // same category as top
    ];
    const result = selectExplorationCandidate(drinks, makeTaste(), top, lowConf, baseConfig);
    expect(result).toBeNull();
  });
});

describe('computeDimensionWeights', () => {
  it('returns all 1s when no confidence provided', () => {
    const weights = computeDimensionWeights();
    expect(weights).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('clamps values to [0.3, 1.0]', () => {
    const weights = computeDimensionWeights({ sweetness: 0.1, bitterness: 0.5, acidity: 0.9, body: 2.0, complexity: 0.5, carbonation: 0.5 });
    expect(weights[0]).toBe(0.3); // clamped up
    expect(weights[1]).toBe(0.5);
    expect(weights[3]).toBe(1.0); // clamped down
  });
});
