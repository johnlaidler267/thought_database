-- Update profiles table to support subscription tiers and usage tracking
-- IMPORTANT: Run this AFTER SUPABASE_SCHEMA.sql and SUPABASE_PROFILES_SCHEMA.sql
-- Or use SUPABASE_COMPLETE_SETUP.sql which includes everything in the correct order
-- Run this SQL in your Supabase SQL editor

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'trial' CHECK (tier IN ('trial', 'sovereign', 'apprentice', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Note: In production, you should encrypt the openai_api_key column
-- Consider using Supabase Vault or a similar encryption solution for sensitive data

