-- Complete Supabase Setup for Thought Notary
-- Run this SQL in your Supabase SQL editor in order
-- This file contains everything in the correct order

-- ============================================
-- STEP 1: Create thoughts table
-- ============================================
CREATE TABLE IF NOT EXISTS thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_transcript TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);

-- ============================================
-- STEP 2: Create profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  notary_credits INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Add subscription and tier columns to profiles
-- ============================================
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'trial' CHECK (tier IN ('trial', 'sovereign', 'apprentice', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- ============================================
-- STEP 4: Add user_id to thoughts table
-- ============================================
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 5: Enable Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS Policies for profiles
-- ============================================
-- Policy: Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 7: Create RLS Policies for thoughts
-- ============================================
-- Remove the old "Allow all operations" policy if it exists
DROP POLICY IF EXISTS "Allow all operations" ON thoughts;

-- Policy: Users can only see their own thoughts
DROP POLICY IF EXISTS "Users can view own thoughts" ON thoughts;
CREATE POLICY "Users can view own thoughts" ON thoughts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own thoughts
DROP POLICY IF EXISTS "Users can insert own thoughts" ON thoughts;
CREATE POLICY "Users can insert own thoughts" ON thoughts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own thoughts
DROP POLICY IF EXISTS "Users can update own thoughts" ON thoughts;
CREATE POLICY "Users can update own thoughts" ON thoughts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own thoughts
DROP POLICY IF EXISTS "Users can delete own thoughts" ON thoughts;
CREATE POLICY "Users can delete own thoughts" ON thoughts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: Create function to automatically create profile on user signup
-- ============================================
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

-- ============================================
-- STEP 9: Create trigger to create profile when user signs up
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

