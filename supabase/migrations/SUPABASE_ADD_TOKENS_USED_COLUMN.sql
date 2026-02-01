-- Add tokens_used column to profiles table for apprentice tier usage tracking
-- Run this in your Supabase SQL editor

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN profiles.tokens_used IS 'Total tokens used this month for apprentice tier users (includes transcription, cleaning, and tagging)';
