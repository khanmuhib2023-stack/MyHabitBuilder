-- =============================================================================
-- Habit Processor — full database setup (paste into Supabase SQL Editor)
-- =============================================================================
-- Fixes: PGRST205 "Could not find the table 'public.habits' in the schema cache"
--
-- Matches the deployed app (sync-code mode):
--   Tables: categories, habits, habit_logs, habit_comments
--   Tenant key: sync_code (NOT user_id — app does not use Supabase Auth right now)
--
-- RLS: enabled on all tables. Policies allow the anon key (browser app) to
-- read/write; the app filters every query by sync_code in application code.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  sync_code text not null,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  sync_code text not null,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  category_name text,
  habit_type text not null,
  unit text,
  target jsonb,
  default_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  sync_code text not null,
  habit_id uuid references public.habits (id) on delete set null,
  habit_name text not null,
  category_name text,
  log_type text,
  value numeric,
  count numeric,
  unit text,
  comment text,
  source text,
  log_date text not null,
  timestamp timestamptz not null,
  created_at timestamptz not null default now(),
  constraint habit_logs_sync_code_habit_id_log_date_key unique (sync_code, habit_id, log_date)
);

create table if not exists public.habit_comments (
  id uuid primary key default gen_random_uuid(),
  sync_code text not null,
  habit_id uuid references public.habits (id) on delete set null,
  habit_name text not null,
  category_name text,
  text text not null,
  sentiment text not null default 'neutral',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists categories_sync_code_idx on public.categories (sync_code);
create index if not exists habits_sync_code_idx on public.habits (sync_code);
create index if not exists habit_logs_sync_code_idx on public.habit_logs (sync_code);
create index if not exists habit_logs_log_date_idx on public.habit_logs (log_date);
create index if not exists habit_comments_sync_code_idx on public.habit_comments (sync_code);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.habit_comments enable row level security;

-- Drop old policy names (auth-based or previous testing names)
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;
drop policy if exists "habits_select_own" on public.habits;
drop policy if exists "habits_insert_own" on public.habits;
drop policy if exists "habits_update_own" on public.habits;
drop policy if exists "habits_delete_own" on public.habits;
drop policy if exists "habit_logs_select_own" on public.habit_logs;
drop policy if exists "habit_logs_insert_own" on public.habit_logs;
drop policy if exists "habit_logs_update_own" on public.habit_logs;
drop policy if exists "habit_logs_delete_own" on public.habit_logs;
drop policy if exists "habit_comments_select_own" on public.habit_comments;
drop policy if exists "habit_comments_insert_own" on public.habit_comments;
drop policy if exists "habit_comments_update_own" on public.habit_comments;
drop policy if exists "habit_comments_delete_own" on public.habit_comments;
drop policy if exists "categories_sync_testing" on public.categories;
drop policy if exists "habits_sync_testing" on public.habits;
drop policy if exists "habit_logs_sync_testing" on public.habit_logs;
drop policy if exists "habit_comments_sync_testing" on public.habit_comments;

-- categories
create policy "categories_select" on public.categories
  for select to anon, authenticated using (true);
create policy "categories_insert" on public.categories
  for insert to anon, authenticated with check (true);
create policy "categories_update" on public.categories
  for update to anon, authenticated using (true) with check (true);
create policy "categories_delete" on public.categories
  for delete to anon, authenticated using (true);

-- habits
create policy "habits_select" on public.habits
  for select to anon, authenticated using (true);
create policy "habits_insert" on public.habits
  for insert to anon, authenticated with check (true);
create policy "habits_update" on public.habits
  for update to anon, authenticated using (true) with check (true);
create policy "habits_delete" on public.habits
  for delete to anon, authenticated using (true);

-- habit_logs
create policy "habit_logs_select" on public.habit_logs
  for select to anon, authenticated using (true);
create policy "habit_logs_insert" on public.habit_logs
  for insert to anon, authenticated with check (true);
create policy "habit_logs_update" on public.habit_logs
  for update to anon, authenticated using (true) with check (true);
create policy "habit_logs_delete" on public.habit_logs
  for delete to anon, authenticated using (true);

-- habit_comments
create policy "habit_comments_select" on public.habit_comments
  for select to anon, authenticated using (true);
create policy "habit_comments_insert" on public.habit_comments
  for insert to anon, authenticated with check (true);
create policy "habit_comments_update" on public.habit_comments
  for update to anon, authenticated using (true) with check (true);
create policy "habit_comments_delete" on public.habit_comments
  for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- API access (anon key used by the browser app)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.categories to anon, authenticated, service_role;
grant select, insert, update, delete on table public.habits to anon, authenticated, service_role;
grant select, insert, update, delete on table public.habit_logs to anon, authenticated, service_role;
grant select, insert, update, delete on table public.habit_comments to anon, authenticated, service_role;

-- Callable from the app if tables are missing (after this script has been run once)
create or replace function public.ensure_habit_processor_tables()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    sync_code text not null,
    name text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table if not exists public.habits (
    id uuid primary key default gen_random_uuid(),
    sync_code text not null,
    name text not null,
    category_id uuid references public.categories (id) on delete set null,
    category_name text,
    habit_type text not null,
    unit text,
    target jsonb,
    default_value jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists public.habit_logs (
    id uuid primary key default gen_random_uuid(),
    sync_code text not null,
    habit_id uuid references public.habits (id) on delete set null,
    habit_name text not null,
    category_name text,
    log_type text,
    value numeric,
    count numeric,
    unit text,
    comment text,
    source text,
    log_date text not null,
    timestamp timestamptz not null,
    created_at timestamptz not null default now(),
    constraint habit_logs_sync_code_habit_id_log_date_key unique (sync_code, habit_id, log_date)
  );

  create table if not exists public.habit_comments (
    id uuid primary key default gen_random_uuid(),
    sync_code text not null,
    habit_id uuid references public.habits (id) on delete set null,
    habit_name text not null,
    category_name text,
    text text not null,
    sentiment text not null default 'neutral',
    created_at timestamptz not null default now(),
    updated_at timestamptz
  );

  alter table public.categories enable row level security;
  alter table public.habits enable row level security;
  alter table public.habit_logs enable row level security;
  alter table public.habit_comments enable row level security;

  perform pg_notify('pgrst', 'reload schema');
  return 'ok';
end;
$$;

grant execute on function public.ensure_habit_processor_tables() to anon, authenticated;

-- Reload PostgREST schema cache (fixes PGRST205 after creating tables)
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Migration (run on existing projects) — scoring + structured habit logs
-- ---------------------------------------------------------------------------
alter table public.habits add column if not exists scoring_key text;
alter table public.habits add column if not exists meta jsonb;
alter table public.habit_logs add column if not exists score numeric;
alter table public.habit_logs add column if not exists payload jsonb;

notify pgrst, 'reload schema';
