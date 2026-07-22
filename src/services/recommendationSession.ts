import { supabase, isSupabaseConfigured } from './supabase';
import { processSyncQueue } from './syncQueue';
import { isAuthenticated } from './auth';
import type { ScoredRecommendation } from '../types/supabase';

const ENGINE_VERSION = '1.0.0';
const MODEL_VERSION = '1.0.0';

export type RecommendationSurface = 'feed' | 'live' | 'profile';

interface RecommendationItem {
  drink_id: string;
  rank: number;
  raw_score: number;
  normalized_score: number;
  type: 'exploit' | 'explore';
  reason: string;
}

export interface SessionRecord {
  userId: string;
  surface: RecommendationSurface;
  context?: string;
  items: RecommendationItem[];
}

export async function recordRecommendationSession(
  session: SessionRecord,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !session.userId) return null;
  if (!isAuthenticated()) return null;

  const sessionId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;

  try {
    const { error } = await supabase!
      .from('recommendation_sessions')
      .insert({
        id: sessionId,
        user_id: session.userId,
        context: session.context ?? null,
        surface: session.surface,
        engine_version: ENGINE_VERSION,
        model_version: MODEL_VERSION,
        items: session.items,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[recSession] insert error:', error.message);
      return null;
    }

    return sessionId;
  } catch (err) {
    console.error('[recSession] exception:', err);
    return null;
  }
}

export function buildSessionItems(
  scored: ScoredRecommendation[],
): RecommendationItem[] {
  return scored.map((s, i) => ({
    drink_id: s.drinkId,
    rank: i + 1,
    raw_score: (s as any).rawScore ?? s.score / 100,
    normalized_score: s.score,
    type: (s as any).recommendationType ?? 'exploit',
    reason: s.reason,
  }));
}
