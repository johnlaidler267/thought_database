-- Add follow_ups column: array of { text, created_at } for follow-up comments on a thought.
-- Run this in the Supabase SQL Editor (or via migrations) so follow-ups persist after reload.
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS follow_ups JSONB DEFAULT '[]';
