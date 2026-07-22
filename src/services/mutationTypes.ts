export type MutationType =
  | 'upsert_taste_profile'
  | 'upsert_drink_rating';

export type MutationStatus = 'pending' | 'syncing' | 'failed';

export interface SyncMutation {
  id: string;
  userId: string;
  mutationType: MutationType;
  entityKey: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError?: string;
  status: MutationStatus;
}

export function generateMutationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export function entityKeyForRating(userId: string, drinkId: string): string {
  return `rating:${userId}:${drinkId}`;
}

export function entityKeyForTasteProfile(userId: string): string {
  return `taste_profile:${userId}`;
}

export function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  const msg = String(error).toLowerCase();
  // Network and timeout errors are retryable
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) return true;
  // 5xx errors are retryable
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true;
  // Auth errors are not retryable
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden')) return false;
  // Schema errors are not retryable
  if (msg.includes('schema') || msg.includes('column') || msg.includes('relation') || msg.includes('does not exist')) return false;
  // All other errors are retryable (transient)
  return true;
}

export function shouldRetry(mutation: SyncMutation, maxAttempts = 5): boolean {
  if (mutation.attemptCount >= maxAttempts) return false;
  if (mutation.status === 'failed' && mutation.lastError) {
    return isRetryableError(mutation.lastError);
  }
  return true;
}
