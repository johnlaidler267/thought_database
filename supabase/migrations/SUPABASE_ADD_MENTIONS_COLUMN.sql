-- Add mentions column to thoughts table (person names extracted from text)
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';
