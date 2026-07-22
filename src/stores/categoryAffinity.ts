import type { CategoryEvidence } from './tasteModelTypes';

const LOVE_WEIGHT = 1.0;
const LIKE_WEIGHT = 0.4;
const SKIP_WEIGHT = -0.6;
const SMOOTHING_FACTOR = 0.15;
const AFFINITY_SCALE = 10;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function evidenceWeight(rating: 'love' | 'like' | 'skip'): number {
  switch (rating) {
    case 'love': return LOVE_WEIGHT;
    case 'like': return LIKE_WEIGHT;
    case 'skip': return SKIP_WEIGHT;
  }
}

export function updateCategoryAffinity(
  evidence: CategoryEvidence,
  rating: 'love' | 'like' | 'skip',
  timestamp: string,
): CategoryEvidence {
  const weight = evidenceWeight(rating);

  const newPositive = weight > 0
    ? evidence.positiveWeight + weight
    : evidence.positiveWeight;

  const newNegative = weight < 0
    ? evidence.negativeWeight + Math.abs(weight)
    : evidence.negativeWeight;

  const newCount = evidence.interactionCount + 1;

  // Net score with smoothing to prevent wild swings
  const netScore = newPositive - newNegative;
  const rawAffinity = sigmoid(netScore / AFFINITY_SCALE);
  const normalizedAffinity = evidence.interactionCount === 0
    ? rawAffinity
    : evidence.normalizedAffinity * (1 - SMOOTHING_FACTOR) + rawAffinity * SMOOTHING_FACTOR;

  return {
    positiveWeight: newPositive,
    negativeWeight: newNegative,
    interactionCount: newCount,
    lastTimestamp: timestamp,
    normalizedAffinity: Math.max(0, Math.min(1, normalizedAffinity)),
  };
}

export function isCategoryEligible(
  evidence: CategoryEvidence,
  threshold = 0.3,
): boolean {
  return evidence.normalizedAffinity >= threshold;
}

export function getPreferredCategories(
  allCategories: string[],
  categoryAffinities: Record<string, CategoryEvidence>,
): string[] {
  return allCategories.filter((cat) => {
    const ev = categoryAffinities[cat];
    return ev ? isCategoryEligible(ev) : false;
  });
}
