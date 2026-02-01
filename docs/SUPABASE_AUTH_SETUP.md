# Supabase Auth Setup Guide

## 1. Enable Authentication Providers

In your Supabase dashboard:

1. Go to **Authentication** > **Providers**
2. Enable the following providers:
   - **Apple** (Sign in with Apple)
   - **Google** (Google OAuth)
   - **Email** (Magic Links - already enabled by default)

## 2. Configure Apple Sign In

1. In Supabase dashboard, go to **Authentication** > **Providers** > **Apple**
2. You'll need:
   - **Services ID**: From Apple Developer account
   - **Team ID**: From Apple Developer account
   - **Key ID**: From Apple Developer account
   - **Private Key**: Download from Apple Developer account

3. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

## 3. Configure Google Sign In

1. In Supabase dashboard, go to **Authentication** > **Providers** > **Google**
2. You'll need:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

3. In Google Cloud Console:
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

## 4. Configure Email Magic Links

1. Go to **Authentication** > **Email Templates**
2. Customize the magic link email template if desired
3. Magic links are enabled by default

## 5. Set Redirect URLs

In **Authentication** > **URL Configuration**:
- **Site URL**: Your production URL (e.g., `https://yourdomain.com`)
- **Redirect URLs**: Add your local and production URLs:
  - `http://localhost:5173/`
  - `https://yourdomain.com/`

## 6. Run Database Schema

Run the SQL from `../supabase/SUPABASE_COMPLETE_SETUP.sql` in your Supabase SQL editor (or use the migrations in `../supabase/README.md`) to:
- Create the profiles table
- Set up Row Level Security policies
- Create the auto-profile creation trigger

## 7. Test Authentication

1. Start your frontend: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Try signing in with Apple, Google, or Email
4. You should be redirected to the homepage (`/`) after successful authentication

