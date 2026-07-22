import { scoreDrinks, rankDrinksForFeed } from '../recommendationEngine';
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
    preferredCategories: [],
    ...overrides,
  };
}

// ── Empty / edge cases ─────────────────────────────────────────────

describe('scoreDrinks', () => {
  it('returns empty array for empty drinks list', () => {
    const result = scoreDrinks([], makeTaste());
    expect(result).toEqual([]);
  });

  it('returns a result for every drink', () => {
    const drinks = [makeDrink({ id: 'a' }), makeDrink({ id: 'b' }), makeDrink({ id: 'c' })];
    const result = scoreDrinks(drinks, makeTaste());
    expect(result).toHaveLength(3);
  });

  // ── Numeric taste similarity (45%) ──────────────────────────────

  it('gives highest score to drink matching user taste vector exactly', () => {
    const userTaste = makeTaste({ sweetness: 8, bitterness: 2, acidity: 3, body: 7, complexity: 6, carbonation: 9 });
    const perfect = makeDrink({ id: 'perfect', sweetness_score: 8, bitterness_score: 2, acidity_score: 3, body_score: 7, complexity_score: 6, carbonation_score: 9 });
    const opposite = makeDrink({ id: 'opposite', sweetness_score: 2, bitterness_score: 8, acidity_score: 7, body_score: 3, complexity_score: 4, carbonation_score: 1 });
    const result = scoreDrinks([perfect, opposite], userTaste);
    const perfectScore = result.find(r => r.drinkId === 'perfect')!.score;
    const oppositeScore = result.find(r => r.drinkId === 'opposite')!.score;
    expect(perfectScore).toBeGreaterThan(oppositeScore);
  });

  it('treats null score fields as 5 (neutral)', () => {
    const userTaste = makeTaste({ sweetness: 1, bitterness: 1, acidity: 1, body: 1, complexity: 1, carbonation: 1 });
    const nullDrink = makeDrink({ id: 'nulls', sweetness_score: null, bitterness_score: null, acidity_score: null, body_score: null, complexity_score: null, carbonation_score: null });
    const matchedDrink = makeDrink({ id: 'matched', sweetness_score: 1, bitterness_score: 1, acidity_score: 1, body_score: 1, complexity_score: 1, carbonation_score: 1 });
    const result = scoreDrinks([nullDrink, matchedDrink], userTaste);
    const nullScore = result.find(r => r.drinkId === 'nulls')!.score;
    const matchedScore = result.find(r => r.drinkId === 'matched')!.score;
    expect(matchedScore).toBeGreaterThan(nullScore);
  });

  // ── Flavor tag matching (20%) ───────────────────────────────────

  it('boosts score when drink has favorite flavor tags', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus', 'herbal'] });
    const matching = makeDrink({ id: 'match', flavor_tags: ['citrus', 'herbal', 'dry'] });
    const noMatch = makeDrink({ id: 'no-match', flavor_tags: ['bitter', 'bold'] });
    const result = scoreDrinks([matching, noMatch], userTaste);
    const matchScore = result.find(r => r.drinkId === 'match')!.score;
    const noMatchScore = result.find(r => r.drinkId === 'no-match')!.score;
    expect(matchScore).toBeGreaterThan(noMatchScore);
  });

  it('penalizes score when drink has avoided flavor tags', () => {
    const userTaste = makeTaste({ avoidedFlavorTags: ['bitter'] });
    const withBitter = makeDrink({ id: 'bitter', flavor_tags: ['bitter', 'bold'] });
    const clean = makeDrink({ id: 'clean', flavor_tags: ['sweet', 'light'] });
    const result = scoreDrinks([withBitter, clean], userTaste);
    const bitterScore = result.find(r => r.drinkId === 'bitter')!.score;
    const cleanScore = result.find(r => r.drinkId === 'clean')!.score;
    expect(cleanScore).toBeGreaterThan(bitterScore);
  });

  it('handles null drink flavor_tags gracefully', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus'] });
    const nullTags = makeDrink({ id: 'null-tags', flavor_tags: null });
    expect(() => scoreDrinks([nullTags], userTaste)).not.toThrow();
  });

  it('handles empty user flavor tags without error', () => {
    const drink = makeDrink({ flavor_tags: ['citrus', 'herbal'] });
    expect(() => scoreDrinks([drink], makeTaste())).not.toThrow();
  });

  // ── Category preference (15%) ───────────────────────────────────

  it('gives full catScore for exact category match', () => {
    const userTaste = makeTaste({ preferredCategories: ['Beer'] });
    const beer = makeDrink({ id: 'beer', category: 'Beer' });
    const wine = makeDrink({ id: 'wine', category: 'Wine' });
    const result = scoreDrinks([beer, wine], userTaste);
    const beerScore = result.find(r => r.drinkId === 'beer')!.score;
    const wineScore = result.find(r => r.drinkId === 'wine')!.score;
    expect(beerScore).toBeGreaterThan(wineScore);
  });

  it('gives fallback score for sparse category fallback match', () => {
    const userTaste = makeTaste({ preferredCategories: ['Spirit'] });
    const spirit = makeDrink({ id: 'spirit', category: 'Spirit' });
    const aperitif = makeDrink({ id: 'aperitif', category: 'Aperitif' });
    const beer = makeDrink({ id: 'beer', category: 'Beer' });
    // Spirit → Aperitif, RTD Mocktail fallbacks. With only 1 spirit, it's sparse.
    const result = scoreDrinks([spirit, aperitif, beer], userTaste);
    const spiritScore = result.find(r => r.drinkId === 'spirit')!.score;
    const aperitifScore = result.find(r => r.drinkId === 'aperitif')!.score;
    const beerScore = result.find(r => r.drinkId === 'beer')!.score;
    expect(spiritScore).toBeGreaterThan(aperitifScore);
    expect(aperitifScore).toBeGreaterThan(beerScore);
  });

  it('gives 0 catScore when category has no match or fallback', () => {
    const userTaste = makeTaste({ preferredCategories: ['Beer'] });
    const unrelated = makeDrink({ id: 'unrelated', category: 'Kombucha' });
    const result = scoreDrinks([unrelated], userTaste);
    expect(result[0].score).toBeLessThan(100);
  });

  // ── Occasion match (10%) ────────────────────────────────────────

  it('boosts score when drink matches occasion context', () => {
    const userTaste = makeTaste();
    const matching = makeDrink({ id: 'party', occasion_tags: ['party', 'social'] });
    const noMatch = makeDrink({ id: 'relax', occasion_tags: ['relax', 'evening'] });
    const context = { occasion: 'party' };
    const result = scoreDrinks([matching, noMatch], userTaste, context);
    const partyScore = result.find(r => r.drinkId === 'party')!.score;
    const relaxScore = result.find(r => r.drinkId === 'relax')!.score;
    expect(partyScore).toBeGreaterThan(relaxScore);
  });

  it('handles undefined occasion context gracefully', () => {
    const drink = makeDrink({ occasion_tags: ['party'] });
    expect(() => scoreDrinks([drink], makeTaste())).not.toThrow();
  });

  it('handles null occasion_tags gracefully', () => {
    const drink = makeDrink({ id: 'null-occ', occasion_tags: null });
    const context = { occasion: 'party' };
    expect(() => scoreDrinks([drink], makeTaste(), context)).not.toThrow();
  });

  // ── Feedback history (10%) ──────────────────────────────────────

  it('boosts score for previously loved drinks', () => {
    const userTaste = makeTaste();
    const drink = makeDrink({ id: 'loved' });
    const rated = new Map([['loved', 'love' as const]]);
    const result = scoreDrinks([drink], userTaste, undefined, rated);
    expect(result[0].score).toBeGreaterThan(50);
  });

  it('lightly boosts score for previously liked drinks', () => {
    const drink = makeDrink({ id: 'liked' });
    const rated = new Map([['liked', 'like' as const]]);
    const result = scoreDrinks([drink], makeTaste(), undefined, rated);
    expect(result[0].score).toBeGreaterThan(50);
  });

  it('penalizes score for previously skipped drinks', () => {
    const userTaste = makeTaste();
    const skipped = makeDrink({ id: 'skipped' });
    const fresh = makeDrink({ id: 'fresh' });
    const rated = new Map([['skipped', 'skip' as const]]);
    const result = scoreDrinks([skipped, fresh], userTaste, undefined, rated);
    const skippedScore = result.find(r => r.drinkId === 'skipped')!.score;
    const freshScore = result.find(r => r.drinkId === 'fresh')!.score;
    expect(freshScore).toBeGreaterThan(skippedScore);
  });

  it('handles undefined ratedDrinkIds gracefully', () => {
    const drink = makeDrink();
    expect(() => scoreDrinks([drink], makeTaste())).not.toThrow();
  });

  // ── Sorting and normalization ───────────────────────────────────

  it('sorts results by score descending', () => {
    const userTaste = makeTaste({ preferredCategories: ['Beer'] });
    const best = makeDrink({ id: 'best', category: 'Beer', sweetness_score: 10, flavor_tags: ['citrus'] });
    const worst = makeDrink({ id: 'worst', category: 'Wine', sweetness_score: 0, flavor_tags: ['bitter'] });
    const user = { ...userTaste, favoriteFlavorTags: ['citrus'], avoidedFlavorTags: ['bitter'] };
    const result = scoreDrinks([worst, best], user);
    expect(result[0].drinkId).toBe('best');
    expect(result[1].drinkId).toBe('worst');
  });

  it('normalizes scores to 0-100 range', () => {
    const drinks = [makeDrink({ id: 'a' }), makeDrink({ id: 'b' })];
    const result = scoreDrinks(drinks, makeTaste());
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('returns integer scores', () => {
    const drinks = [makeDrink({ id: 'a' }), makeDrink({ id: 'b', category: 'Wine' })];
    const result = scoreDrinks(drinks, makeTaste({ preferredCategories: ['Beer'] }));
    for (const r of result) {
      expect(Number.isInteger(r.score)).toBe(true);
    }
  });

  // ── Reason generation ───────────────────────────────────────────

  it('includes a reason string for every result', () => {
    const result = scoreDrinks([makeDrink()], makeTaste());
    expect(result[0].reason).toBeTruthy();
    expect(typeof result[0].reason).toBe('string');
  });

  it('generates multi-tag match reason when 2+ tags overlap', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus', 'herbal', 'dry'] });
    const drink = makeDrink({ flavor_tags: ['citrus', 'herbal'] });
    const result = scoreDrinks([drink], userTaste);
    expect(result[0].reason).toMatch(/citrus, herbal/);
  });

  it('generates single-tag match reason when 1 tag overlaps', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus', 'herbal'] });
    const drink = makeDrink({ flavor_tags: ['citrus'] });
    const result = scoreDrinks([drink], userTaste);
    expect(result[0].reason).toMatch(/citrus/);
  });

  it('generates occasion reason when no tag matches', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus'] });
    const drink = makeDrink({ id: 'occ', flavor_tags: ['herbal'], occasion_tags: ['party'] });
    const result = scoreDrinks([drink], userTaste, { occasion: 'party' });
    expect(result[0].reason).toMatch(/party/);
  });

  it('falls back to generic reason when nothing matches', () => {
    const userTaste = makeTaste({ favoriteFlavorTags: ['citrus'] });
    const drink = makeDrink({ flavor_tags: ['herbal'], occasion_tags: ['relax'] });
    const result = scoreDrinks([drink], userTaste, { occasion: 'party' });
    expect(result[0].reason).toMatch(/taste profile/);
  });

  // ── Sparse category fallback expansion ──────────────────────────

  it('expands preferred categories via fallbacks when sparse', () => {
    const userTaste = makeTaste({ preferredCategories: ['Spirit'] });
    // Only 1 Spirit drink → below SPARSE_THRESHOLD (10)
    // Spirit fallbacks: Aperitif, Mixer, RTD Mocktail
    const spirit = makeDrink({ id: 'spirit', category: 'Spirit' });
    const mixer = makeDrink({ id: 'mixer', category: 'Mixer' });
    const beer = makeDrink({ id: 'beer', category: 'Beer' });
    const result = scoreDrinks([spirit, mixer, beer], userTaste);
    const spiritScore = result.find(r => r.drinkId === 'spirit')!.score;
    const mixerScore = result.find(r => r.drinkId === 'mixer')!.score;
    const beerScore = result.find(r => r.drinkId === 'beer')!.score;
    expect(spiritScore).toBeGreaterThan(mixerScore);
    expect(mixerScore).toBeGreaterThan(beerScore);
  });

  it('does not expand fallbacks when category is above sparse threshold', () => {
    const userTaste = makeTaste({ preferredCategories: ['Beer'] });
    // 11 Beer drinks → above SPARSE_THRESHOLD → Beer has fallbacks Hop Water, Functional Drink, RTD Mocktail
    // but they should NOT get fallback credit since Beer isn't sparse
    const beers = Array.from({ length: 11 }, (_, i) => makeDrink({ id: `beer-${i}`, category: 'Beer' }));
    const hopWater = makeDrink({ id: 'hop-water', category: 'Hop Water' });
    const all = [...beers, hopWater];
    const result = scoreDrinks(all, userTaste);
    const hopScore = result.find(r => r.drinkId === 'hop-water')!.score;
    const beerScore = result.find(r => r.drinkId === 'beer-0')!.score;
    expect(beerScore).toBeGreaterThan(hopScore);
  });

  // ── rankDrinksForFeed ───────────────────────────────────────────

  describe('rankDrinksForFeed', () => {
    it('is a convenience wrapper around scoreDrinks without context', () => {
      const drinks = [makeDrink({ id: 'a' }), makeDrink({ id: 'b' })];
      const result = rankDrinksForFeed(drinks, makeTaste());
      expect(result).toHaveLength(2);
      for (const r of result) {
        expect(r.drinkId).toBeTruthy();
        expect(typeof r.score).toBe('number');
        expect(typeof r.reason).toBe('string');
      }
    });

    it('accepts ratedDrinkIds parameter', () => {
      const drink = makeDrink({ id: 'rated' });
      const rated = new Map([['rated', 'love' as const]]);
      const result = rankDrinksForFeed([drink], makeTaste(), rated);
      expect(result[0].drinkId).toBe('rated');
    });

    it('handles empty drinks gracefully', () => {
      const result = rankDrinksForFeed([], makeTaste());
      expect(result).toEqual([]);
    });
  });
});
