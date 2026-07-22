import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncMutation, MutationType, MutationStatus } from './mutationTypes';
import {
  generateMutationId,
  isRetryableError,
  shouldRetry,
} from './mutationTypes';
import { isSupabaseConfigured, supabase } from './supabase';

const QUEUE_KEY = '@ss_sync_queue';
const PROCESSING_KEY = '@ss_sync_processing';
const MAX_BATCH_SIZE = 10;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

let isProcessing = false;

// ── Queue persistence ─────────────────────────────────────────────

async function loadQueue(): Promise<SyncMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[syncQueue] save error:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────

export async function enqueueMutation(
  userId: string,
  mutationType: MutationType,
  entityKey: string,
  payload: unknown,
): Promise<void> {
  const queue = await loadQueue();
  const existingIndex = queue.findIndex(
    (m) => m.entityKey === entityKey && m.status === 'pending'
  );

  const entry: SyncMutation = {
    id: generateMutationId(),
    userId,
    mutationType,
    entityKey,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attemptCount: 0,
    status: 'pending',
  };

  if (existingIndex >= 0) {
    // Coalesce: update existing pending mutation in place
    queue[existingIndex] = { ...queue[existingIndex], ...entry, id: queue[existingIndex].id };
  } else {
    queue.push(entry);
  }

  await saveQueue(queue);
}

export async function getQueueSize(): Promise<number> {
  const queue = await loadQueue();
  return queue.filter((m) => m.status === 'pending' || m.status === 'failed').length;
}

export async function getFailedCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.filter((m) => m.status === 'failed').length;
}

export async function getQueueSnapshot(): Promise<SyncMutation[]> {
  return loadQueue();
}

export async function retryFailedMutations(): Promise<void> {
  const queue = await loadQueue();
  let changed = false;
  for (const m of queue) {
    if (m.status === 'failed' && shouldRetry(m)) {
      m.status = 'pending';
      m.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await saveQueue(queue);
}

async function removeCompletedMutations(): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((m) => m.status !== 'syncing');
  await saveQueue(filtered);
}

// ── Exponential backoff ───────────────────────────────────────────

function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
  // Add jitter: ±25%
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// ── Mutation processing ───────────────────────────────────────────

async function executeMutation(mutation: SyncMutation): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const execute = async (): Promise<boolean> => {
    switch (mutation.mutationType) {
      case 'upsert_drink_rating': {
        const payload = mutation.payload as {
          drinkId: string;
          rating: 'love' | 'like' | 'skip';
          feedbackTags?: string[];
        };
        const { error } = await supabase!
          .from('drink_ratings')
          .upsert({
            user_id: mutation.userId,
            drink_id: payload.drinkId,
            rating: payload.rating,
            feedback_tags: payload.feedbackTags ?? null,
          }, { onConflict: 'user_id, drink_id' });
        if (error) throw error;
        return true;
      }

      case 'upsert_taste_profile': {
        const payload = mutation.payload as Record<string, unknown>;
        const { error } = await supabase!
          .from('taste_profiles')
          .upsert({
            user_id: mutation.userId,
            ...payload,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
        return true;
      }

      default:
        console.warn('[syncQueue] Unknown mutation type:', mutation.mutationType);
        return false;
    }
  };

  const result = await Promise.race([
    execute(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS)
    ),
  ]);
  return result;
}

export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  if (isProcessing) return { processed: 0, failed: 0 };
  if (!isSupabaseConfigured()) return { processed: 0, failed: 0 };

  isProcessing = true;

  try {
    const processing = await AsyncStorage.getItem(PROCESSING_KEY);
    if (processing === 'true') {
      console.log('[syncQueue] Already processing, skipping');
      return { processed: 0, failed: 0 };
    }
    await AsyncStorage.setItem(PROCESSING_KEY, 'true');

    const queue = await loadQueue();
    const pending = queue.filter(
      (m) => m.status === 'pending' || (m.status === 'failed' && shouldRetry(m))
    );

    if (pending.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const batch = pending.slice(0, MAX_BATCH_SIZE);
    let processed = 0;
    let failed = 0;

    for (const mutation of batch) {
      mutation.status = 'syncing';
      mutation.attemptCount += 1;
      mutation.updatedAt = new Date().toISOString();

      try {
        const success = await executeMutation(mutation);
        if (success) {
          // Remove from queue after success
          const idx = queue.findIndex((m) => m.id === mutation.id);
          if (idx >= 0) queue.splice(idx, 1);
          processed++;
        } else {
          mutation.status = 'failed';
          mutation.lastError = 'Unknown mutation type';
          failed++;
        }
      } catch (err) {
        mutation.status = 'failed';
        mutation.lastError = String(err);
        failed++;

        if (isRetryableError(err) && shouldRetry(mutation)) {
          const delay = calculateBackoff(mutation.attemptCount);
          mutation.updatedAt = new Date(Date.now() + delay).toISOString();
          // Don't remove — it'll be retried on next cycle
        }
      }
    }

    await saveQueue(queue);
    return { processed, failed };
  } finally {
    await AsyncStorage.setItem(PROCESSING_KEY, 'false');
    isProcessing = false;
  }
}
