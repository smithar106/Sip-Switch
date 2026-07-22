import {
  isRetryableError,
  shouldRetry,
  entityKeyForRating,
  entityKeyForTasteProfile,
} from '../mutationTypes';
import type { SyncMutation } from '../mutationTypes';

describe('entityKeyForRating', () => {
  it('creates a composite key from userId and drinkId', () => {
    expect(entityKeyForRating('user-1', 'drink-1')).toBe('rating:user-1:drink-1');
  });
});

describe('entityKeyForTasteProfile', () => {
  it('creates a key from userId', () => {
    expect(entityKeyForTasteProfile('user-1')).toBe('taste_profile:user-1');
  });
});

describe('isRetryableError', () => {
  it('returns true for network errors', () => {
    expect(isRetryableError('network error')).toBe(true);
    expect(isRetryableError('TypeError: fetch failed')).toBe(true);
    expect(isRetryableError('Network request failed')).toBe(true);
  });

  it('returns true for timeout errors', () => {
    expect(isRetryableError('timeout')).toBe(true);
    expect(isRetryableError('Request timeout')).toBe(true);
  });

  it('returns true for 5xx errors', () => {
    expect(isRetryableError('500 Internal Server Error')).toBe(true);
    expect(isRetryableError('502 Bad Gateway')).toBe(true);
    expect(isRetryableError('503 Service Unavailable')).toBe(true);
  });

  it('returns false for auth errors', () => {
    expect(isRetryableError('auth error')).toBe(false);
    expect(isRetryableError('unauthorized')).toBe(false);
    expect(isRetryableError('forbidden')).toBe(false);
  });

  it('returns false for schema errors', () => {
    expect(isRetryableError('schema mismatch')).toBe(false);
    expect(isRetryableError('column "foo" does not exist')).toBe(false);
    expect(isRetryableError('relation "bar" does not exist')).toBe(false);
  });

  it('returns true for null/undefined errors', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('shouldRetry', () => {
  function makeMutation(overrides: Partial<SyncMutation> = {}): SyncMutation {
    return {
      id: 'test',
      userId: 'user-1',
      mutationType: 'upsert_drink_rating',
      entityKey: 'rating:user-1:drink-1',
      payload: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
      ...overrides,
    };
  }

  it('returns true for pending mutations within attempt limit', () => {
    expect(shouldRetry(makeMutation())).toBe(true);
  });

  it('returns false when max attempts exceeded', () => {
    expect(shouldRetry(makeMutation({ attemptCount: 5 }), 5)).toBe(false);
    expect(shouldRetry(makeMutation({ attemptCount: 6 }), 5)).toBe(false);
  });

  it('returns false for non-retryable failures', () => {
    const mut = makeMutation({ status: 'failed', lastError: 'unauthorized', attemptCount: 1 });
    expect(shouldRetry(mut, 5)).toBe(false);
  });

  it('returns true for retryable failures', () => {
    const mut = makeMutation({ status: 'failed', lastError: 'network error', attemptCount: 1 });
    expect(shouldRetry(mut, 5)).toBe(true);
  });
});
