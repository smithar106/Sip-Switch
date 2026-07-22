import { updateCategoryAffinity, isCategoryEligible, getPreferredCategories } from '../categoryAffinity';
import { emptyCategoryEvidence } from '../tasteModelTypes';

describe('updateCategoryAffinity', () => {
  it('increases affinity on love rating', () => {
    const ev = emptyCategoryEvidence();
    const result = updateCategoryAffinity(ev, 'love', '2025-01-01T00:00:00Z');
    expect(result.normalizedAffinity).toBeGreaterThan(0.5);
    expect(result.positiveWeight).toBe(1.0);
    expect(result.interactionCount).toBe(1);
  });

  it('moderately increases affinity on like rating', () => {
    const ev = emptyCategoryEvidence();
    const result = updateCategoryAffinity(ev, 'like', '2025-01-01T00:00:00Z');
    expect(result.normalizedAffinity).toBeGreaterThan(0.5);
    expect(result.normalizedAffinity).toBeLessThan(
      updateCategoryAffinity(ev, 'love', '2025-01-01T00:00:00Z').normalizedAffinity
    );
  });

  it('decreases affinity on skip rating', () => {
    const ev = emptyCategoryEvidence();
    const result = updateCategoryAffinity(ev, 'skip', '2025-01-01T00:00:00Z');
    expect(result.normalizedAffinity).toBeLessThan(0.5);
    expect(result.negativeWeight).toBeGreaterThan(0);
  });

  it('accumulates multiple loves', () => {
    let ev = emptyCategoryEvidence();
    for (let i = 0; i < 5; i++) {
      ev = updateCategoryAffinity(ev, 'love', `2025-01-0${i + 1}T00:00:00Z`);
    }
    expect(ev.normalizedAffinity).toBeGreaterThan(0.5);
    expect(ev.positiveWeight).toBeCloseTo(5.0);
    expect(ev.interactionCount).toBe(5);
  });

  it('recovers from a single skip after multiple loves', () => {
    let ev = emptyCategoryEvidence();
    for (let i = 0; i < 3; i++) {
      ev = updateCategoryAffinity(ev, 'love', `2025-01-0${i + 1}T00:00:00Z`);
    }
    const beforeSkip = ev.normalizedAffinity;
    ev = updateCategoryAffinity(ev, 'skip', '2025-01-04T00:00:00Z');
    // Should decrease but not dramatically
    expect(ev.normalizedAffinity).toBeLessThanOrEqual(beforeSkip + 0.01);
    expect(ev.normalizedAffinity).toBeGreaterThan(0.3);
  });

  it('tracks timestamps', () => {
    const ev = emptyCategoryEvidence();
    const result = updateCategoryAffinity(ev, 'love', '2025-06-01T12:00:00Z');
    expect(result.lastTimestamp).toBe('2025-06-01T12:00:00Z');
  });
});

describe('isCategoryEligible', () => {
  it('returns true for high affinity', () => {
    const ev = { positiveWeight: 5, negativeWeight: 0, interactionCount: 5, lastTimestamp: null, normalizedAffinity: 0.8 };
    expect(isCategoryEligible(ev)).toBe(true);
  });

  it('returns false for low affinity', () => {
    const ev = { positiveWeight: 0, negativeWeight: 5, interactionCount: 5, lastTimestamp: null, normalizedAffinity: 0.1 };
    expect(isCategoryEligible(ev)).toBe(false);
  });

  it('uses custom threshold', () => {
    const ev = { positiveWeight: 0, negativeWeight: 0, interactionCount: 0, lastTimestamp: null, normalizedAffinity: 0.5 };
    expect(isCategoryEligible(ev, 0.6)).toBe(false);
    expect(isCategoryEligible(ev, 0.4)).toBe(true);
  });
});

describe('getPreferredCategories', () => {
  it('returns eligible categories only', () => {
    const affinities = {
      beer: { positiveWeight: 5, negativeWeight: 0, interactionCount: 5, lastTimestamp: null, normalizedAffinity: 0.9 },
      wine: { positiveWeight: 0, negativeWeight: 3, interactionCount: 3, lastTimestamp: null, normalizedAffinity: 0.2 },
    };
    const result = getPreferredCategories(['beer', 'wine', 'spirit'], affinities);
    expect(result).toEqual(['beer']);
  });

  it('returns empty for no affinities', () => {
    const result = getPreferredCategories(['beer', 'wine'], {});
    expect(result).toEqual([]);
  });
});
