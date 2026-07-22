/**
 * Deterministic evaluation harness for the recommendation engine.
 *
 * Run: npx ts-node scripts/eval-recommendations.ts
 * Or:  npm run eval:recommendations
 *
 * Fails with exit code 1 when critical thresholds regress.
 */

import { scoreDrinks, rankDrinksForFeed, computeDimensionWeights } from '../src/utils/recommendationEngine';
import type { SupabaseDrink, UserTasteVector, ScoredRecommendation } from '../src/types/supabase';

// ── Test data factories ───────────────────────────────────────────

function makeDrink(overrides: Partial<SupabaseDrink> = {}): SupabaseDrink {
  return {
    id: `drink-${Math.random().toString(36).substring(2, 6)}`,
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

// ── Synthetic users ───────────────────────────────────────────────

const SYNTHETIC_USERS = {
  bitterComplex: makeTaste({
    sweetness: 2,
    bitterness: 8,
    acidity: 6,
    body: 7,
    complexity: 9,
    carbonation: 3,
    favoriteFlavorTags: ['bitter', 'complex', 'herbal'],
    avoidedFlavorTags: ['light'],
    preferredCategories: ['Spirit', 'Aperitif'],
  }),

  sweetLight: makeTaste({
    sweetness: 8,
    bitterness: 2,
    acidity: 3,
    body: 3,
    complexity: 4,
    carbonation: 8,
    favoriteFlavorTags: ['light', 'carbonated', 'citrus'],
    avoidedFlavorTags: ['bitter', 'bold'],
    preferredCategories: ['Beer', 'Sparkling'],
  }),

  beerDrinker: makeTaste({
    sweetness: 5,
    bitterness: 6,
    acidity: 4,
    body: 6,
    complexity: 5,
    carbonation: 7,
    favoriteFlavorTags: ['carbonated', 'light'],
    avoidedFlavorTags: ['complex'],
    preferredCategories: ['Beer', 'Hop Water'],
  }),

  spiritHater: makeTaste({
    sweetness: 7,
    bitterness: 2,
    acidity: 5,
    body: 4,
    complexity: 3,
    carbonation: 6,
    favoriteFlavorTags: ['sweet', 'light', 'citrus'],
    avoidedFlavorTags: ['bitter', 'bold'],
    preferredCategories: ['Beer', 'RTD Mocktail'],
  }),

  newUser: makeTaste({
    sweetness: 5,
    bitterness: 5,
    acidity: 5,
    body: 5,
    complexity: 5,
    carbonation: 5,
    favoriteFlavorTags: [],
    avoidedFlavorTags: [],
    preferredCategories: [],
  }),
};

// ── Test catalog ──────────────────────────────────────────────────

function buildTestCatalog(): SupabaseDrink[] {
  return [
    makeDrink({ id: 'bitter-ipa', category: 'Beer', sweetness_score: 2, bitterness_score: 9, acidity_score: 5, body_score: 7, complexity_score: 8, carbonation_score: 6, flavor_tags: ['bitter', 'complex', 'bold'], occasion_tags: ['social'] }),
    makeDrink({ id: 'light-lager', category: 'Beer', sweetness_score: 4, bitterness_score: 3, acidity_score: 3, body_score: 3, complexity_score: 2, carbonation_score: 8, flavor_tags: ['light', 'carbonated', 'clean'], occasion_tags: ['casual'] }),
    makeDrink({ id: 'crisp-wine', category: 'Wine', sweetness_score: 2, bitterness_score: 3, acidity_score: 8, body_score: 4, complexity_score: 7, carbonation_score: 1, flavor_tags: ['dry', 'complex', 'citrus'], occasion_tags: ['dinner'] }),
    makeDrink({ id: 'sweet-wine', category: 'Wine', sweetness_score: 8, bitterness_score: 2, acidity_score: 4, body_score: 3, complexity_score: 3, carbonation_score: 2, flavor_tags: ['sweet', 'light'], occasion_tags: ['party'] }),
    makeDrink({ id: 'herbal-spirit', category: 'Spirit', sweetness_score: 3, bitterness_score: 7, acidity_score: 4, body_score: 6, complexity_score: 9, carbonation_score: 1, flavor_tags: ['bitter', 'complex', 'herbal'], occasion_tags: ['evening'] }),
    makeDrink({ id: 'sweet-rtd', category: 'RTD Mocktail', sweetness_score: 9, bitterness_score: 1, acidity_score: 3, body_score: 2, complexity_score: 1, carbonation_score: 7, flavor_tags: ['sweet', 'light', 'carbonated'], occasion_tags: ['party', 'social'] }),
    makeDrink({ id: 'functional-soda', category: 'Functional Drink', sweetness_score: 6, bitterness_score: 3, acidity_score: 5, body_score: 3, complexity_score: 2, carbonation_score: 9, flavor_tags: ['citrus', 'light', 'carbonated'], occasion_tags: ['morning', 'workout'] }),
    makeDrink({ id: 'hoppy-water', category: 'Hop Water', sweetness_score: 1, bitterness_score: 8, acidity_score: 5, body_score: 3, complexity_score: 6, carbonation_score: 8, flavor_tags: ['bitter', 'carbonated', 'herbal'], occasion_tags: ['casual'] }),
    makeDrink({ id: 'complex-aperitif', category: 'Aperitif', sweetness_score: 4, bitterness_score: 6, acidity_score: 7, body_score: 5, complexity_score: 8, carbonation_score: 3, flavor_tags: ['bitter', 'complex', 'herbal', 'citrus'], occasion_tags: ['dinner', 'evening'] }),
    makeDrink({ id: 'light-kombucha', category: 'Kombucha', sweetness_score: 5, bitterness_score: 2, acidity_score: 7, body_score: 2, complexity_score: 4, carbonation_score: 6, flavor_tags: ['citrus', 'light', 'carbonated'], occasion_tags: ['morning', 'casual'] }),
  ];
}

// ── Metrics ───────────────────────────────────────────────────────

interface EvalResult {
  testName: string;
  passed: boolean;
  details: string;
  threshold?: number;
  actual?: number;
}

const results: EvalResult[] = [];

function check(
  name: string,
  condition: boolean,
  details: string,
  threshold?: number,
  actual?: number,
) {
  results.push({ testName: name, passed: condition, details, threshold, actual });
}

function verifyTopKRanking() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.bitterComplex;
  const scored = rankDrinksForFeed(catalog, user);

  // Bitter/complex user should rank bitter-ipa, herbal-spirit, complex-aperitif highest
  const top3 = scored.slice(0, 3).map((s) => s.drinkId);
  check(
    'bitterComplex: top 3 contains bitter-ipa',
    top3.includes('bitter-ipa'),
    `Top 3: ${top3.join(', ')}`,
  );
  check(
    'bitterComplex: top 3 contains herbal-spirit',
    top3.includes('herbal-spirit'),
    `Top 3: ${top3.join(', ')}`,
  );
  check(
    'bitterComplex: top 3 contains complex-aperitif',
    top3.includes('complex-aperitif'),
    `Top 3: ${top3.join(', ')}`,
  );

  // Sweet/light user should rank sweet-rtd, light-lager, functional-soda highest
  const sweet = SYNTHETIC_USERS.sweetLight;
  const sweetScored = rankDrinksForFeed(catalog, sweet);
  const sweetTop3 = sweetScored.slice(0, 3).map((s) => s.drinkId);
  check(
    'sweetLight: top 3 contains sweet-rtd',
    sweetTop3.includes('sweet-rtd'),
    `Top 3: ${sweetTop3.join(', ')}`,
  );
  check(
    'sweetLight: top 3 does not contain bitter-ipa',
    !sweetTop3.includes('bitter-ipa'),
    `Top 3: ${sweetTop3.join(', ')}`,
  );
}

function verifyRankSeparation() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.beerDrinker;
  const scored = rankDrinksForFeed(catalog, user);

  // Verify scores decrease monotonically
  let monotonic = true;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > scored[i - 1].score) {
      monotonic = false;
      break;
    }
  }
  check(
    'rankSeparation: scores are monotonically decreasing',
    monotonic,
    `First 5 scores: ${scored.slice(0, 5).map((s) => s.score).join(', ')}`,
  );

  // Verify distinct scores (not all identical)
  const uniqueScores = new Set(scored.map((s) => s.score));
  check(
    'rankSeparation: produces distinct scores',
    uniqueScores.size > 1,
    `Unique scores: ${uniqueScores.size}`,
  );
}

function verifySkipSimulation() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.spiritHater;
  const rated = new Map<string, 'love' | 'like' | 'skip'>([
    ['bitter-ipa', 'skip'],
    ['herbal-spirit', 'skip'],
    ['hoppy-water', 'skip'],
  ]);
  const scored = rankDrinksForFeed(catalog, user, rated);
  const top = scored[0];

  check(
    'skipPenalty: skipped drinks not at top',
    top.drinkId !== 'bitter-ipa' && top.drinkId !== 'herbal-spirit',
    `Top drink: ${top.drinkId} (score: ${top.score})`,
  );

  const skipPenaltyScore = scored.find((s) => s.drinkId === 'bitter-ipa')?.score ?? 100;
  check(
    'skipPenalty: skipped drink score below 70',
    skipPenaltyScore < 70,
    `Skipped drink score: ${skipPenaltyScore}`,
    70,
    skipPenaltyScore,
  );
}

function verifyLoveRateSimulation() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.newUser;
  const rated = new Map<string, 'love' | 'like' | 'skip'>([
    ['bitter-ipa', 'love'],
    ['hoppy-water', 'love'],
  ]);
  const scored = rankDrinksForFeed(catalog, user, rated);
  const top3 = scored.slice(0, 3).map((s) => s.drinkId);

  const bitterDrinksInTop = top3.filter((id) => {
    const d = catalog.find((c) => c.id === id);
    return d && (d.bitterness_score >= 6 || d.complexity_score >= 6);
  }).length;

  check(
    'loveRate: loved bitter drinks boost similar drinks in top 3',
    bitterDrinksInTop >= 1,
    `Bitter/complex in top 3: ${bitterDrinksInTop}`,
    1,
    bitterDrinksInTop,
  );
}

function verifyDeterministic() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.bitterComplex;
  const run1 = rankDrinksForFeed(catalog, user);
  const run2 = rankDrinksForFeed(catalog, user);

  const ids1 = run1.map((s) => s.drinkId).join(',');
  const ids2 = run2.map((s) => s.drinkId).join(',');
  check(
    'deterministic: identical rankings across runs',
    ids1 === ids2,
    `Run 1: ${ids1}`,
  );
}

function verifyConvergence() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.beerDrinker;

  // Simulate feedback loop: love on beer, skip on wine
  const rated = new Map<string, 'love' | 'like' | 'skip'>();
  for (let i = 0; i < 5; i++) {
    rated.set('light-lager', 'love');
    rated.set('crisp-wine', 'skip');
    rated.set('sweet-wine', 'skip');
  }

  const scored = rankDrinksForFeed(catalog, user, rated);
  const top3 = scored.slice(0, 3).map((s) => s.drinkId);

  check(
    'convergence: beer-oriented user has beers in top 3 after feedback',
    top3.some((id) => catalog.find((d) => d.id === id)?.category === 'Beer'),
    `Top 3: ${top3.join(', ')}`,
  );

  const topScore = scored[0]?.score ?? 0;
  check(
    'convergence: top score after feedback meets threshold',
    topScore >= 70,
    `Top score: ${topScore}`,
    70,
    topScore,
  );
}

function verifyCategoryAdaptation() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.bitterComplex;

  // User has Spirit/Aperitif as preferred categories
  const scored = rankDrinksForFeed(catalog, user);
  const top5 = scored.slice(0, 5).map((s) => s.drinkId);

  check(
    'categoryAdaptation: Spirit/Aperitif user sees relevant categories',
    top5.some((id) => {
      const d = catalog.find((c) => c.id === id);
      return d?.category === 'Spirit' || d?.category === 'Aperitif';
    }),
    `Top 5: ${top5.join(', ')}`,
  );

  const relevantCount = top5.filter((id) => {
    const d = catalog.find((c) => c.id === id);
    return d?.category === 'Spirit' || d?.category === 'Aperitif';
  }).length;
  check(
    'categoryAdaptation: at least 2 of top 5 are preferred category',
    relevantCount >= 2,
    `Relevant in top 5: ${relevantCount}`,
    2,
    relevantCount,
  );
}

function verifyConfidenceCalibration() {
  // New user should have low confidence
  const newUserConf = 0;
  const dimConf = computeDimensionWeights({ sweetness: 0.1, bitterness: 0.1, acidity: 0.1, body: 0.1, complexity: 0.1, carbonation: 0.1 });
  check(
    'confidence: low-confidence dimensions produce weights near 0.3',
    dimConf.every((w) => w >= 0.3 && w <= 0.5),
    `Weights: ${dimConf.map((w) => w.toFixed(2)).join(', ')}`,
    0.3,
    Math.min(...dimConf),
  );

  const highConf = computeDimensionWeights({ sweetness: 0.9, bitterness: 0.9, acidity: 0.9, body: 0.9, complexity: 0.9, carbonation: 0.9 });
  check(
    'confidence: high-confidence dimensions produce weights near 1.0',
    highConf.every((w) => w >= 0.8),
    `Weights: ${highConf.map((w) => w.toFixed(2)).join(', ')}`,
    0.8,
    Math.min(...highConf),
  );
}

function verifyExplorationPreserved() {
  const catalog = buildTestCatalog();
  const user = SYNTHETIC_USERS.newUser;
  const dimConf = { sweetness: 0.3, bitterness: 0.9, acidity: 0.9, body: 0.9, complexity: 0.9, carbonation: 0.9 };
  const scored = scoreDrinks(catalog, user, undefined, undefined, dimConf, { enabled: true, explorationSlotIndex: 2, lowConfidenceThreshold: 0.5 });
  const types = scored.map((s) => (s as any).recommendationType ?? 'exploit');

  check(
    'exploration: at least one explore recommendation exists',
    types.includes('explore'),
    `Types: ${types.slice(0, 5).join(', ')}`,
  );

  const exploreCount = types.filter((t) => t === 'explore').length;
  check(
    'exploration: exactly 1 explore in top 5 (constrained)',
    exploreCount === 1,
    `Explore count: ${exploreCount}`,
    1,
    exploreCount,
  );
}

// ── Run all evaluations ───────────────────────────────────────────

const ALL_TESTS = [
  verifyTopKRanking,
  verifyRankSeparation,
  verifySkipSimulation,
  verifyLoveRateSimulation,
  verifyDeterministic,
  verifyConvergence,
  verifyCategoryAdaptation,
  verifyConfidenceCalibration,
  verifyExplorationPreserved,
];

function run() {
  console.log('\n=== Recommendation Engine Evaluation ===\n');

  for (const test of ALL_TESTS) {
    try {
      test();
    } catch (err) {
      results.push({
        testName: test.name,
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`  ${icon} ${r.testName}`);
    console.log(`     ${r.details}`);
    if (r.passed) passed++;
    else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed, ${results.length} total\n`);

  if (failed > 0) {
    console.error('Critical thresholds regressed!');
    process.exit(1);
  }
}

run();
