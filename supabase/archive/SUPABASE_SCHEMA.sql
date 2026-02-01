-- Thought Notary Supabase Schema
-- Run this SQL in your Supabase SQL editor to create the thoughts table

CREATE TABLE IF NOT EXISTS thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_transcript TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your auth needs)
-- For a personal app, you might want to restrict this based on user_id
CREATE POLICY "Allow all operations" ON thoughts
  FOR ALL
  USING (true)
  WITH CHECK (true);

