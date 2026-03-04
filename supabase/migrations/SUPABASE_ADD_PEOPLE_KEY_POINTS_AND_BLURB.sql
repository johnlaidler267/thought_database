-- Add key_points and blurb columns to people table for Person Profile Blurb feature
-- key_points: array of extracted key points, one per thought
-- blurb: generated summary displayed at top of Person Profile panel

ALTER TABLE people ADD COLUMN IF NOT EXISTS key_points TEXT[] DEFAULT '{}';
ALTER TABLE people ADD COLUMN IF NOT EXISTS blurb TEXT;
