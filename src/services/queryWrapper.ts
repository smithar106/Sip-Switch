/**
 * Structured Supabase query wrapper.
 *
 * Replaces repeated raw try/catch blocks with typed result states.
 * Supports timeout, error categorization, and logging hooks.
 */

import { isSupabaseConfigured } from './supabase';

export type QueryErrorCategory =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'schema'
  | 'not_found'
  | 'constraint'
  | 'unknown';

export interface QueryError {
  category: QueryErrorCategory;
  message: string;
  original: unknown;
  retryable: boolean;
}

export interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
  success: boolean;
}

function categorizeError(err: unknown): QueryError {
  const msg = String(err).toLowerCase();

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('enotfound')) {
    return { category: 'network', message: String(err), original: err, retryable: true };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { category: 'timeout', message: String(err), original: err, retryable: true };
  }
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('JWT')) {
    return { category: 'auth', message: String(err), original: err, retryable: false };
  }
  if (msg.includes('schema') || msg.includes('column') || msg.includes('relation') || msg.includes('does not exist')) {
    return { category: 'schema', message: String(err), original: err, retryable: false };
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return { category: 'not_found', message: String(err), original: err, retryable: true };
  }
  if (msg.includes('unique') || msg.includes('violates') || msg.includes('foreign key') || msg.includes('constraint')) {
    return { category: 'constraint', message: String(err), original: err, retryable: false };
  }

  return { category: 'unknown', message: String(err), original: err, retryable: true };
}

export function notConfiguredError(): QueryError {
  return {
    category: 'network',
    message: 'Supabase is not configured',
    original: null,
    retryable: false,
  };
}

export function success<T>(data: T): QueryResult<T> {
  return { data, error: null, success: true };
}

export function failure<T>(err: unknown): QueryResult<T> {
  return { data: null, error: categorizeError(err), success: false };
}

export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options?: {
    timeoutMs?: number;
    retries?: number;
    logErrors?: boolean;
  },
): Promise<QueryResult<T>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: notConfiguredError(), success: false };
  }

  const timeoutMs = options?.timeoutMs ?? 10_000;
  const maxRetries = options?.retries ?? 1;
  const logErrors = options?.logErrors ?? true;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs),
        ),
      ]);

      if (result.error) {
        const qErr = categorizeError(result.error);
        if (logErrors) {
          console.error(`[queryWrapper] Query error:`, result.error);
        }
        return { data: null, error: qErr, success: false };
      }

      return { data: result.data, error: null, success: true };
    } catch (err) {
      const qErr = categorizeError(err);
      if (attempt < maxRetries - 1 && qErr.retryable) {
        if (logErrors) {
          console.warn(`[queryWrapper] Retry ${attempt + 1}/${maxRetries}:`, qErr.message);
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        continue;
      }

      if (logErrors) {
        console.error(`[queryWrapper] Failed after ${attempt + 1} attempts:`, err);
      }
      return { data: null, error: qErr, success: false };
    }
  }

  return { data: null, error: categorizeError('Max retries exceeded'), success: false };
}
