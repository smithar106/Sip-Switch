-- Sip Switch: Initial Schema
-- Run in Supabase SQL editor.

-- 1. drinks --------------------------------------------------------
create table drinks (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  brand               text,
  category            text not null,
  subcategory         text,
  description         text,
  image_url           text,
  product_url         text,
  price_range         text,
  availability_regions text[],
  sweetness_score     int check (sweetness_score between 0 and 10),
  bitterness_score    int check (bitterness_score between 0 and 10),
  acidity_score       int check (acidity_score between 0 and 10),
  body_score          int check (body_score between 0 and 10),
  complexity_score    int check (complexity_score between 0 and 10),
  carbonation_score   int check (carbonation_score between 0 and 10),
  flavor_tags         text[],
  occasion_tags       text[],
  food_pairing_tags   text[],
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 2. taste_profiles ------------------------------------------------
create table taste_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid,
  archetype_id          text,
  archetype_name        text,
  confidence_score      int check (confidence_score between 0 and 100),
  sweetness_preference  int check (sweetness_preference between 0 and 10),
  bitterness_preference int check (bitterness_preference between 0 and 10),
  acidity_preference    int check (acidity_preference between 0 and 10),
  body_preference       int check (body_preference between 0 and 10),
  complexity_preference int check (complexity_preference between 0 and 10),
  carbonation_preference int check (carbonation_preference between 0 and 10),
  preferred_categories  text[],
  favorite_flavor_tags  text[],
  avoided_flavor_tags   text[],
  onboarding_answers    jsonb,
  total_ratings         int default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- 3. drink_ratings -------------------------------------------------
create table drink_ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  drink_id      uuid references drinks(id) on delete cascade,
  rating        text not null check (rating in ('love', 'like', 'skip')),
  feedback_tags text[],
  created_at    timestamptz default now()
);

-- 4. recommendation_sessions ---------------------------------------
create table recommendation_sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid,
  taste_profile_id     uuid references taste_profiles(id),
  context              text,
  recommended_drink_ids uuid[],
  scores               jsonb,
  created_at           timestamptz default now()
);

-- Indexes ----------------------------------------------------------
create index idx_drinks_category          on drinks(category);
create index idx_drinks_subcategory       on drinks(subcategory);
create index idx_drinks_is_active         on drinks(is_active);
create index idx_drinks_flavor_tags       on drinks using gin(flavor_tags);
create index idx_drinks_occasion_tags     on drinks using gin(occasion_tags);
create index idx_drinks_food_pairing_tags on drinks using gin(food_pairing_tags);
create index idx_taste_profiles_user_id   on taste_profiles(user_id);
create index idx_drink_ratings_user_id    on drink_ratings(user_id);
create index idx_drink_ratings_drink_id   on drink_ratings(drink_id);
create index idx_rec_sessions_user_id     on recommendation_sessions(user_id);

-- Row-Level Security -----------------------------------------------
alter table drinks                  enable row level security;
alter table taste_profiles          enable row level security;
alter table drink_ratings           enable row level security;
alter table recommendation_sessions enable row level security;

-- drinks: publicly readable active drinks
create policy "drinks_public_read_active"
  on drinks for select
  using (is_active = true);

-- taste_profiles: user owns their row
create policy "taste_profiles_user_select"
  on taste_profiles for select
  using (user_id = auth.uid());

create policy "taste_profiles_user_insert"
  on taste_profiles for insert
  with check (user_id = auth.uid());

create policy "taste_profiles_user_update"
  on taste_profiles for update
  using (user_id = auth.uid());

-- drink_ratings: user owns their ratings
create policy "drink_ratings_user_select"
  on drink_ratings for select
  using (user_id = auth.uid());

create policy "drink_ratings_user_insert"
  on drink_ratings for insert
  with check (user_id = auth.uid());

create policy "drink_ratings_user_update"
  on drink_ratings for update
  using (user_id = auth.uid());

-- recommendation_sessions: user owns their sessions
create policy "rec_sessions_user_select"
  on recommendation_sessions for select
  using (user_id = auth.uid());

create policy "rec_sessions_user_insert"
  on recommendation_sessions for insert
  with check (user_id = auth.uid());
