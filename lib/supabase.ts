/*
  Supabase table DDL — run once in your Supabase SQL editor:
  -----------------------------------------------------------
  create table quiz_leads (
    id uuid primary key default gen_random_uuid(),
    email text,
    archetype_id text not null,
    answers jsonb,
    created_at timestamptz default now()
  );
*/

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export const supabase = getClient();
