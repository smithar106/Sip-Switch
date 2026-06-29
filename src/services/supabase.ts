/*
  Supabase DDL — run once in your Supabase SQL editor:
  -----------------------------------------------------------
  create table quiz_leads (
    id uuid primary key default gen_random_uuid(),
    email text,
    archetype_id text not null,
    answers jsonb,
    created_at timestamptz default now()
  );

  create table drink_ratings (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    drink_id text not null,
    rating text not null check (rating in ('love','like','skip','save')),
    created_at timestamptz default now()
  );
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function saveQuizResult(archetypeId: string, answers: Record<string, string>, email?: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('quiz_leads').upsert({
      email: email ?? null,
      archetype_id: archetypeId,
      answers,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}
