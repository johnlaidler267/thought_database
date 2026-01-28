# SQL Migration Files

## Recommended Setup

**For new installations, use:**
- `SUPABASE_COMPLETE_SETUP.sql` - Contains everything in the correct order

## Migration Files (for existing databases)

- `SUPABASE_ADD_TOKENS_USED_COLUMN.sql` - Adds `tokens_used` column (replaces deprecated `credits_used` and `minutes_used`)
- `SUPABASE_ADD_CATEGORY_COLUMN.sql` - Adds `category` column to thoughts table

## Legacy Files (kept for reference)

These files are kept for historical reference but are superseded by `SUPABASE_COMPLETE_SETUP.sql`:
- `SUPABASE_SCHEMA.sql` - Initial thoughts table (now in COMPLETE_SETUP)
- `SUPABASE_PROFILES_SCHEMA.sql` - Initial profiles table (now in COMPLETE_SETUP)
- `SUPABASE_PROFILES_SCHEMA_UPDATE.sql` - Subscription columns (now in COMPLETE_SETUP)
