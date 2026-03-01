-- Add follow_ups column: array of { text, created_at } for follow-up comments on a thought
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS follow_ups JSONB DEFAULT '[]';
