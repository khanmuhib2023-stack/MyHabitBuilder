-- Habit Processor — sync code mode (no Supabase Auth)
-- Run in Supabase SQL Editor. For existing auth-based DBs, run migration_sync_code.sql instead.

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
  unique (sync_code, habit_id, log_date)
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

create index if not exists habits_sync_code_idx on public.habits (sync_code);
create index if not exists habit_logs_sync_code_idx on public.habit_logs (sync_code);
create index if not exists habit_logs_log_date_idx on public.habit_logs (log_date);
create index if not exists habit_comments_sync_code_idx on public.habit_comments (sync_code);
create index if not exists categories_sync_code_idx on public.categories (sync_code);

alter table public.categories enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.habit_comments enable row level security;

-- Temporary testing policies: anon client can read/write (app filters by sync_code in queries).
-- NOT production-safe — anyone with the anon key could access all rows.

create policy "categories_sync_testing" on public.categories
  for all to anon, authenticated using (true) with check (true);

create policy "habits_sync_testing" on public.habits
  for all to anon, authenticated using (true) with check (true);

create policy "habit_logs_sync_testing" on public.habit_logs
  for all to anon, authenticated using (true) with check (true);

create policy "habit_comments_sync_testing" on public.habit_comments
  for all to anon, authenticated using (true) with check (true);
