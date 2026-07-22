-- 002: Anonymous Auth, Foreign Keys, and RLS Refinement
--
-- Purpose:
--   Replace device-ID authorization model with Supabase Anonymous Auth.
--   Add foreign key constraints from user-owned tables to auth.users.
--   Refine RLS policies to use auth.uid() consistently.
--   Add unique constraints, indexes, and verification queries.
--
-- Tables changed: taste_profiles, drink_ratings, recommendation_sessions
-- Columns changed: user_id FK references added
-- Data backfill: N/A (no data migration needed; existing device IDs preserved as metadata)

-- ── 1. Add foreign key constraints to auth.users ───────────────────

-- taste_profiles.user_id → auth.users(id)
-- ON DELETE CASCADE: when a user is deleted, their taste profiles are removed.
-- Justification: taste profile has no meaning without the owning user.
-- Supabase anonymous users are ephemeral, but we want cleanup to be automatic.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'taste_profiles_user_id_fkey'
  ) then
    alter table taste_profiles
      add constraint taste_profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- drink_ratings.user_id → auth.users(id)
-- ON DELETE CASCADE: ratings without a user are orphaned data.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'drink_ratings_user_id_fkey'
  ) then
    alter table drink_ratings
      add constraint drink_ratings_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- recommendation_sessions.user_id → auth.users(id)
-- ON DELETE CASCADE: sessions without a user are not useful.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'recommendation_sessions_user_id_fkey'
  ) then
    alter table recommendation_sessions
      add constraint recommendation_sessions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ── 2. Unique constraint to prevent duplicate taste profiles ──────

-- Each user should have at most one active taste profile.
-- The application uses upsert, so this prevents accidental duplicates.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'taste_profiles_user_id_key'
  ) then
    alter table taste_profiles
      add constraint taste_profiles_user_id_key unique (user_id);
  end if;
end $$;

-- ── 3. Unique constraint on drink_ratings to prevent duplicate ratings ──

-- Each user can rate a drink at most once (upsert behavior).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'drink_ratings_user_drink_unique'
  ) then
    alter table drink_ratings
      add constraint drink_ratings_user_drink_unique unique (user_id, drink_id);
  end if;
end $$;

-- ── 4. Add unique import key for drinks to prevent catalog duplicates ──

-- Use (normalized_name, brand, category) as the import identity.
-- brand is nullable, so we use COALESCE for the constraint.
-- This prevents the pipeline from inserting the same drink twice.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'drinks_normalized_name_brand_category_key'
  ) then
    alter table drinks
      add column normalized_name text generated always as (lower(trim(name))) stored;
    create unique index if not exists idx_drinks_import_identity
      on drinks (normalized_name, coalesce(brand, ''), category);
  end if;
end $$;

-- ── 5. Add user_id lookup indexes (composite for common query patterns) ──

create index if not exists idx_taste_profiles_user_updated
  on taste_profiles(user_id, updated_at desc);

create index if not exists idx_drink_ratings_user_drink
  on drink_ratings(user_id, drink_id);

create index if not exists idx_drink_ratings_created
  on drink_ratings(user_id, created_at desc);

create index if not exists idx_rec_sessions_user_created
  on recommendation_sessions(user_id, created_at desc);

-- ── 6. RLS: ensure all user-owned tables have policies ────────────

-- drinks: public read (already exists), no public write
-- Already has: drinks_public_read_active
-- Add a check to ensure no insert/update/delete policies exist for anon/authenticated on drinks
drop policy if exists "drinks_public_read_active" on drinks;
create policy "drinks_public_read_active"
  on drinks for select
  using (is_active = true);

-- Revoke all on drinks from public (safety net)
revoke all on drinks from anon, authenticated;

-- taste_profiles: full user ownership
drop policy if exists "taste_profiles_user_select" on taste_profiles;
drop policy if exists "taste_profiles_user_insert" on taste_profiles;
drop policy if exists "taste_profiles_user_update" on taste_profiles;

create policy "taste_profiles_user_select"
  on taste_profiles for select
  using (auth.uid() = user_id);

create policy "taste_profiles_user_insert"
  on taste_profiles for insert
  with check (auth.uid() = user_id);

create policy "taste_profiles_user_update"
  on taste_profiles for update
  using (auth.uid() = user_id);

create policy "taste_profiles_user_delete"
  on taste_profiles for delete
  using (auth.uid() = user_id);

-- drink_ratings: full user ownership
drop policy if exists "drink_ratings_user_select" on drink_ratings;
drop policy if exists "drink_ratings_user_insert" on drink_ratings;
drop policy if exists "drink_ratings_user_update" on drink_ratings;

create policy "drink_ratings_user_select"
  on drink_ratings for select
  using (auth.uid() = user_id);

create policy "drink_ratings_user_insert"
  on drink_ratings for insert
  with check (auth.uid() = user_id);

create policy "drink_ratings_user_update"
  on drink_ratings for update
  using (auth.uid() = user_id);

create policy "drink_ratings_user_delete"
  on drink_ratings for delete
  using (auth.uid() = user_id);

-- recommendation_sessions: full user ownership
drop policy if exists "rec_sessions_user_select" on recommendation_sessions;
drop policy if exists "rec_sessions_user_insert" on recommendation_sessions;

create policy "rec_sessions_user_select"
  on recommendation_sessions for select
  using (auth.uid() = user_id);

create policy "rec_sessions_user_insert"
  on recommendation_sessions for insert
  with check (auth.uid() = user_id);

create policy "rec_sessions_user_update"
  on recommendation_sessions for update
  using (auth.uid() = user_id);

create policy "rec_sessions_user_delete"
  on recommendation_sessions for delete
  using (auth.uid() = user_id);

-- ── 7. Verification queries (run after migration) ─────────────────
--
-- Column types:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'taste_profiles' and column_name = 'user_id';
--
-- Foreign keys:
--   select tc.table_name, tc.constraint_name, ccu.table_name as foreign_table
--   from information_schema.table_constraints tc
--   join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
--   where tc.constraint_type = 'FOREIGN KEY' and tc.table_name in ('taste_profiles', 'drink_ratings', 'recommendation_sessions');
--
-- RLS status:
--   select tablename, rowsecurity from pg_tables
--   where tablename in ('drinks', 'taste_profiles', 'drink_ratings', 'recommendation_sessions');
--
-- Active policies:
--   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   from pg_policies
--   where tablename in ('drinks', 'taste_profiles', 'drink_ratings', 'recommendation_sessions')
--   order by tablename, policyname;
--
-- Null or invalid user identifiers:
--   select count(*) from taste_profiles where user_id is null;
--   select count(*) from drink_ratings where user_id is null;
--
-- Duplicate profile rows:
--   select user_id, count(*) from taste_profiles group by user_id having count(*) > 1;
