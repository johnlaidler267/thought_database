-- Profiles table for Thought Notary
-- IMPORTANT: Run SUPABASE_SCHEMA.sql FIRST to create the thoughts table
-- Run this SQL in your Supabase SQL editor AFTER running SUPABASE_SCHEMA.sql

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  notary_credits INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update thoughts table to include user_id
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS for thoughts table
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own thoughts
CREATE POLICY "Users can view own thoughts" ON thoughts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own thoughts
CREATE POLICY "Users can insert own thoughts" ON thoughts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own thoughts
CREATE POLICY "Users can update own thoughts" ON thoughts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own thoughts
CREATE POLICY "Users can delete own thoughts" ON thoughts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, notary_credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

