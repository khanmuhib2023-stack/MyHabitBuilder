# Supabase setup

## Error: `PGRST205` — table `public.habits` not found

The database tables have not been created yet. Run the full setup script:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste the entire contents of **`schema.sql`**
3. Click **Run**
4. Wait a few seconds, then reload your deployed app

## What the app expects

| Table | Used by app |
|-------|-------------|
| `public.categories` | Yes |
| `public.habits` | Yes |
| `public.habit_logs` | Yes |
| `public.habit_comments` | Yes |

**Tenant column:** `sync_code` (text) on every table — matches sync-code login in the app.

The app does **not** use `user_id` or Supabase Auth in the current testing mode.

## Verify tables exist

In SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('categories', 'habits', 'habit_logs', 'habit_comments');
```

You should see four rows.
