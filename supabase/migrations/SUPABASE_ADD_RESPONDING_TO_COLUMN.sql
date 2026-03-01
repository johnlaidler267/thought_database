-- Add responding_to column to thoughts table (for AI thought-starter prompt)
-- Run this SQL in your Supabase SQL editor

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS responding_to TEXT;
