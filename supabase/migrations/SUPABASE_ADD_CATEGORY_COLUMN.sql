-- Add category column to thoughts table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS category TEXT;

-- Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_thoughts_category ON thoughts(category);

