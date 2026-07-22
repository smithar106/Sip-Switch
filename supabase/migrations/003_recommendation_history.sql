-- 003: Recommendation History and Learning Measurement
--
-- Purpose:
--   Enhance recommendation_sessions to be fully auditable.
--   Add structured recommendation items, engine version tracking,
--   and outcome linking for learning measurement.
--
-- Tables changed: recommendation_sessions
-- Columns added: engine_version, model_version, surface, items (jsonb)

-- ── 1. Add columns to recommendation_sessions ─────────────────────

alter table recommendation_sessions
  add column if not exists engine_version text,
  add column if not exists model_version text,
  add column if not exists surface text check (surface in ('feed', 'live', 'profile')),
  add column if not exists items jsonb;

comment on column recommendation_sessions.engine_version is
  'Semantic version of the recommendation engine used';

comment on column recommendation_sessions.model_version is
  'Version of the user taste model at recommendation time';

comment on column recommendation_sessions.surface is
  'Which UI surface generated this session: feed, live, or profile';

comment on column recommendation_sessions.items is
  'Structured array of recommendation items: [{drink_id, rank, raw_score, normalized_score, type, reason}]';

-- ── 2. Index for session analytics ────────────────────────────────

create index if not exists idx_rec_sessions_surface
  on recommendation_sessions(surface);

create index if not exists idx_rec_sessions_engine
  on recommendation_sessions(engine_version);

create index if not exists idx_rec_sessions_model
  on recommendation_sessions(model_version);

-- ── 3. Add drink_ratings.impression_id for linking ────────────────

alter table drink_ratings
  add column if not exists session_id uuid references recommendation_sessions(id);

comment on column drink_ratings.session_id is
  'Links this rating back to the recommendation session that produced it';

create index if not exists idx_drink_ratings_session
  on drink_ratings(session_id);

-- ── 4. Verification queries ───────────────────────────────────────
--
-- New columns:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'recommendation_sessions'
--   order by ordinal_position;
--
-- Items structure:
--   select items->0 as first_item from recommendation_sessions
--   where items is not null limit 1;
--
-- Sessions by surface:
--   select surface, count(*) from recommendation_sessions
--   group by surface order by count(*) desc;
--
-- Rating-to-session linkage:
--   select count(*) from drink_ratings where session_id is not null;
