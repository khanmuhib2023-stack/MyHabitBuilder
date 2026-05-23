-- Migrate from Supabase Auth (user_id) to sync code mode.
-- WARNING: This drops auth-based RLS and user_id columns. Back up first.
-- After running, use sync codes for all data; old user_id rows are not migrated automatically.

-- Drop auth-based policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
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

-- Add sync_code columns
alter table public.categories add column if not exists sync_code text;
alter table public.habits add column if not exists sync_code text;
alter table public.habit_logs add column if not exists sync_code text;
alter table public.habit_comments add column if not exists sync_code text;

-- Drop user_id FK constraints (names may vary; adjust if migration fails)
alter table public.categories drop constraint if exists categories_user_id_fkey;
alter table public.habits drop constraint if exists habits_user_id_fkey;
alter table public.habit_logs drop constraint if exists habit_logs_user_id_fkey;
alter table public.habit_comments drop constraint if exists habit_comments_user_id_fkey;

-- Drop old unique constraint on habit_logs if present
alter table public.habit_logs drop constraint if exists habit_logs_user_id_habit_id_log_date_key;

-- Optional: remove user_id after migrating data manually
-- alter table public.categories drop column if exists user_id;
-- alter table public.habits drop column if exists user_id;
-- alter table public.habit_logs drop column if exists user_id;
-- alter table public.habit_comments drop column if exists user_id;

create unique index if not exists habit_logs_sync_code_habit_date_key
  on public.habit_logs (sync_code, habit_id, log_date);

create index if not exists habits_sync_code_idx on public.habits (sync_code);
create index if not exists habit_logs_sync_code_idx on public.habit_logs (sync_code);
create index if not exists habit_comments_sync_code_idx on public.habit_comments (sync_code);
create index if not exists categories_sync_code_idx on public.categories (sync_code);

-- Testing policies (open — app filters by sync_code)
drop policy if exists "categories_sync_testing" on public.categories;
drop policy if exists "habits_sync_testing" on public.habits;
drop policy if exists "habit_logs_sync_testing" on public.habit_logs;
drop policy if exists "habit_comments_sync_testing" on public.habit_comments;

create policy "categories_sync_testing" on public.categories
  for all to anon, authenticated using (true) with check (true);

create policy "habits_sync_testing" on public.habits
  for all to anon, authenticated using (true) with check (true);

create policy "habit_logs_sync_testing" on public.habit_logs
  for all to anon, authenticated using (true) with check (true);

create policy "habit_comments_sync_testing" on public.habit_comments
  for all to anon, authenticated using (true) with check (true);
