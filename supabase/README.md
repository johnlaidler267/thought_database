# Supabase schema and migrations

All SQL for Thought Notary lives in this folder.

## New installations

**Use the single-file setup:**

- **`SUPABASE_COMPLETE_SETUP.sql`** — Run this in the Supabase SQL editor. It creates thoughts and profiles tables, RLS policies, and subscription columns in the correct order.

## Existing databases (migrations)

If you already have a database and only need to add a column:

- **`migrations/SUPABASE_ADD_TOKENS_USED_COLUMN.sql`** — Adds `tokens_used` to profiles (replaces deprecated `credits_used` / `minutes_used`).
- **`migrations/SUPABASE_ADD_CATEGORY_COLUMN.sql`** — Adds `category` to the thoughts table.

## Legacy / reference only

The files in **`archive/`** are superseded by `SUPABASE_COMPLETE_SETUP.sql` and kept for reference:

- `archive/SUPABASE_SCHEMA.sql` — Original thoughts table.
- `archive/SUPABASE_PROFILES_SCHEMA.sql` — Original profiles table.
- `archive/SUPABASE_PROFILES_SCHEMA_UPDATE.sql` — Subscription columns (now in COMPLETE_SETUP).

You can ignore the archive if you use `SUPABASE_COMPLETE_SETUP.sql` for new projects.
