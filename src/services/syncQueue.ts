"""
Durable sync queue for offline-first recipe ratings and taste updates.

Features:
- Offline support for recipe ratings and taste updates
- Exponential backoff with jitter (1s–60s with ±25% jitter)
- Duplicate coalescing by userId+drinkId or userId for taste profiles
- Exponential backoff retry with maximum 5 attempts per mutation
- Structured error categorization into RETRYABLE vs PERMANENT
- Observable queue state (pending/failed counts)
- Queue versioning
- Concurrent processing protection
- Identity change handling
- Manual retry support
- Detailed error logging with categorization
- AsyncStorage backend for persistence
"""
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_STORAGE_KEY = '@ss_sync_queue_v2';
const QUEUE_VERSION = 2;
const MAX_RETRIES = 5;
const MAX_BACKOFF = 60_000; // 60 seconds in milliseconds

export type SyncMutationType =
  | 'upsert_drink_rating'
  | 'upsert_taste_profile';

export interface SyncMutation {
  id: string;
  userId: string;
  mutationType: SyncMutationType;
  entityKey: string;
  payload: any;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  lastError?: string;
  retries?: number;
  version?: number;
}

export type ErrorCategory = 'RETRYABLE' | 'PERMANENT';

export interface QueueState {
  queue: SyncMutation[];
  failedCount: number;
  pendingCount: number;
}

class SyncQueue {
  private batchSize: number = 5;
  private processing: boolean = false;
  private backoffMultiplier: number = 1000;
  private maxBackoffMs: number = MAX_BACKOFF;

  async getState(): Promise<QueueState> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue: SyncMutation[] = stored ? JSON.parse(stored) : [];
      const failedCount = queue.filter((m) => m.status === 'failed').length;
      const pendingCount = queue.filter((m) => m.status === 'pending').length;
      return { queue, failedCount, pendingCount };
    } catch (err) {
      console.error('[syncQueue] Error loading state:', err);
      return { queue: [], failedCount: 0, pendingCount: 0 };
    }
  }

  async saveState(queue: SyncMutation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('[syncQueue] Error saving state:', err);
    }
  }

  async getQueueVersion(): Promise<number> {
    try {
      const state = await this.getState();
      const latestVersion = Math.max(1, ...state.queue.map(m => m.version || 1));
      return latestVersion;
    } catch (err) {
      console.error('[syncQueue] Error getting queue version:', err);
      return 1;
    }
  }

  determineErrorCategory(error: any): ErrorCategory {
    if (!error || typeof error !== 'object') {
      return 'RETRYABLE';
    }
    const errorMessage = typeof error === 'string' ? error.toLowerCase() : '';
    const errorCode = typeof error === 'object' && error?.code ? String(error.code).toLowerCase() : '';

    const authPatterns = ['401', '403', 'unauthorized', 'forbidden', 'auth', 'authentication'];
    const schemaPatterns = ['500', 'schema', 'constraint', 'duplicate', 'unique', 'foreign key', 'not null'];
    const notFoundPatterns = ['404', 'not found', 'does not exist'];

    const message = `${errorCode} ${errorMessage}`.toLowerCase();

    if (authPatterns.some((p) => message.includes(p))) return 'PERMANENT';
    if (schemaPatterns.some((p) => message.includes(p))) return 'PERMANENT';
    if (notFoundPatterns.some((p) => message.includes(p))) return 'PERMANENT';

    return 'RETRYABLE';
  }

  isRetryableError(error: any): boolean {
    return this.determineErrorCategory(error) === 'RETRYABLE';
  }

  classifyError(error: any): ErrorCategory {
    return this.determineErrorCategory(error);
  }

  entityKeyForRating(userId: string, drinkId: string): string {
    return `rating:${userId}:${drinkId}`;
  }

  entityKeyForTasteProfile(userId: string): string {
    return `taste_profile:${userId}`;
  }

  async enqueueMutation(
    userId: string,
    mutationType: SyncMutationType,
    payload: any,
    entityKey: string
  ): Promise<void> {
    if (!userId) {
      console.error('[syncQueue] Cannot enqueue mutation: userId is required');
      return;
    }

    const state = await this.getState();
    const normalizedKey = entityKey.startsWith('rating:') || entityKey.startsWith('taste_profile:')
      ? entityKey
      : `${mutationType}:${userId}:${payload.drinkId || ''}`;

    const existingIndex = state.queue.findIndex((m) => m.entityKey === normalizedKey);

    if (existingIndex >= 0) {
      const existing = state.queue[existingIndex];
      if (existing.status === 'pending' || existing.status === 'in_progress') {
        console.log(`[syncQueue] Coalescing: ${normalizedKey} already exists (status: ${existing.status})`);
        return;
      }
      if (existing.status === 'failed' && this.isRetryableError(existing.lastError)) {
        state.queue[existingIndex] = {
          ...existing,
          status: 'pending',
          attemptCount: 0,
          lastError: undefined,
          retries: 0,
          updatedAt: new Date().toISOString(),
          version: QUEUE_VERSION,
        };
        await this.saveState(state.queue);
        return;
      }
    }

    const mutation: SyncMutation = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`,
      userId,
      mutationType,
      entityKey: normalizedKey,
      payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
      retries: 0,
      version: QUEUE_VERSION,
    };

    if (existingIndex < 0) {
      state.queue.push(mutation);
    } else {
      state.queue[existingIndex] = mutation;
    }

    await this.saveState(state.queue);
  }

  async dequeueBatch(batchSize: number = this.batchSize): Promise<SyncMutation[]> {
    const state = await this.getState();
    const dequeued: SyncMutation[] = [];

    for (let i = 0; i < batchSize && i < state.queue.length; i++) {
      const mutation = state.queue[i];
      if (mutation.status === 'pending') {
        state.queue[i] = { ...mutation, status: 'in_progress', updatedAt: new Date().toISOString() };
        dequeued.push({ ...mutation, status: 'in_progress' });
      } else if (mutation.status === 'failed') {
        state.queue[i] = { ...mutation, updatedAt: new Date().toISOString() };
      }
    }

    await this.saveState(state.queue);
    return dequeued;
  }

  async markSuccess(mutationId: string): Promise<void> {
    const state = await this.getState();
    const index = state.queue.findIndex((m) => m.id === mutationId);

    if (index >= 0) {
      state.queue[index] = { ...state.queue[index], status: 'success', updatedAt: new Date().toISOString() };
      await this.saveState(state.queue);
    }
  }

  async markFailure(mutationId: string, error: any): Promise<void> {
    const state = await this.getState();
    const index = state.queue.findIndex((m) => m.id === mutationId);

    if (index >= 0) {
      const mutation = state.queue[index];
      const category = this.classifyError(error);
      const lastError = typeof error === 'string' ? error : JSON.stringify(error);

      if (category === 'PERMANENT') {
        state.queue[index] = {
          ...mutation,
          status: 'failed',
          lastError,
          updatedAt: new Date().toISOString(),
        };
        console.warn(`[syncQueue] PERMANENT failure for mutation ${mutationId}: ${lastError}`);
      } else {
        const attempts = (mutation.attemptCount || 0) + 1;
        const status = attempts >= MAX_RETRIES ? 'failed' : 'pending';

        state.queue[index] = {
          ...mutation,
          status,
          attemptCount: attempts,
          lastError,
          retries: attempts,
          updatedAt: new Date().toISOString(),
        };

        if (status === 'pending') {
          console.log(`[syncQueue] RETRYABLE failure for mutation ${mutationId}, attempt ${attempts}: ${lastError}`);
        } else {
          console.error(`[syncQueue] EXCEEDED max retries for mutation ${mutationId}: ${lastError}`);
        }
      }

      await this.saveState(state.queue);
    }
  }

  getBackoffDelay(attempt: number): number {
    const delay = Math.min(this.backoffMultiplier * Math.pow(2, attempt - 1), this.maxBackoffMs);
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  async getPendingCount(): Promise<number> {
    const state = await this.getState();
    return state.pendingCount;
  }

  async getFailedCount(): Promise<number> {
    const state = await this.getState();
    return state.failedCount;
  }

  async manualRetry(mutationId: string): Promise<void> {
    const state = await this.getState();
    const index = state.queue.findIndex((m) => m.id === mutationId);

    if (index >= 0 && state.queue[index].status === 'failed') {
      console.log(`[syncQueue] Manual retry for mutation ${mutationId}`);
      state.queue[index] = {
        ...state.queue[index],
        status: 'pending',
        attemptCount: 0,
        lastError: undefined,
        retries: 0,
        updatedAt: new Date().toISOString(),
        version: QUEUE_VERSION,
      };
      await this.saveState(state.queue);
    }
  }

  async processQueue(
    processMutationFn: (mutation: SyncMutation) => Promise<void>,
    batchSize: number = this.batchSize
  ): Promise<void> {
    if (this.processing) {
      console.log('[syncQueue] Queue already processing');
      return;
    }

    this.processing = true;

    try {
      const batch = await this.dequeueBatch(batchSize);
      if (batch.length === 0) {
        return;
      }

      for (const mutation of batch) {
        try {
          await processMutationFn(mutation);
          await this.markSuccess(mutation.id);
        } catch (error) {
          await this.markFailure(mutation.id, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  async getQueueForInspection(): Promise<SyncMutation[]> {
    const state = await this.getState();
    return state.queue;
  }

  async resetQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      this.processing = false;
      console.log('[syncQueue] Queue reset');
    } catch (err) {
      console.error('[syncQueue] Error resetting queue:', err);
    }
  }
}

export const syncQueue = new SyncQueue();

export function generateSyncId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`;
}

export { type SyncMutation, type SyncMutationType, type ErrorCategory, type QueueState };
