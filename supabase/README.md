# Supabase schema and migrations

All SQL for Thought Notary lives in this folder.

## New installations

Run these in the Supabase SQL editor **in order**:

1. **`SUPABASE_COMPLETE_SETUP.sql`** — Base setup: `thoughts` and `profiles` tables, RLS policies, subscription columns, auth trigger.
2. **`migrations/SUPABASE_ADD_CATEGORY_COLUMN.sql`** — Adds `category` to thoughts.
3. **`migrations/SUPABASE_ADD_MENTIONS_COLUMN.sql`** — Adds `mentions` (TEXT[]) to thoughts.
4. **`migrations/SUPABASE_ADD_PEOPLE_AND_THOUGHT_PEOPLE.sql`** — Creates `people` and `thought_people` tables.
5. **`migrations/SUPABASE_ADD_FOLLOW_UPS_COLUMN.sql`** — Adds `follow_ups` (JSONB) to thoughts.
6. **`migrations/SUPABASE_ADD_DISTILL_COLUMNS.sql`** — Adds `distilled_text` and `distill_history` to thoughts.
7. **`migrations/SUPABASE_ADD_RESPONDING_TO_COLUMN.sql`** — Adds `responding_to` to thoughts.
8. **`migrations/SUPABASE_ADD_THOUGHT_TYPE_COLUMN.sql`** — Adds `thought_type` to thoughts.
9. **`migrations/SUPABASE_ADD_TOKENS_USED_COLUMN.sql`** — Adds `tokens_used` to profiles (skip if already in base setup).
10. **`migrations/SUPABASE_ADD_PEOPLE_KEY_POINTS_AND_BLURB.sql`** — Adds `key_points` and `blurb` to people.

## Schema overview

| Table | Purpose |
|-------|---------|
| `thoughts` | Raw/cleaned transcript, tags, category, mentions, follow_ups, distilled_text, distill_history |
| `profiles` | User profile, tier, Stripe IDs, tokens_used |
| `people` | Person records (display_name, clarifier) |
| `thought_people` | Join table: which thoughts mention which people |

## Existing databases (incremental migrations)

If you already have a database and only need to add a feature, run the relevant migration(s) from the list above. Order matters if migrations depend on each other (e.g. `people` before `thought_people`).

## Legacy / reference only

The files in **`archive/`** are superseded by `SUPABASE_COMPLETE_SETUP.sql` and kept for reference.
