-- Add distillation persistence columns to thoughts table
-- distilled_text: current displayed text when user has distilled (null when at original)
-- distill_history: array of strings for undo stack (e.g. [raw, level1, level2])

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS distilled_text TEXT;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS distill_history JSONB DEFAULT '[]'::jsonb;
