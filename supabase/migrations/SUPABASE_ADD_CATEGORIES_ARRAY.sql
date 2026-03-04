-- Add categories array to thoughts (multiple categories per thought, e.g. playlist-style)
-- Keeps category (singular) for backward compat; app can set category = categories[0] when syncing

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Index for filtering by category membership
CREATE INDEX IF NOT EXISTS idx_thoughts_categories ON thoughts USING GIN (categories);
