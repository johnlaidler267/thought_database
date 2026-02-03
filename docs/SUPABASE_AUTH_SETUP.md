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
2. Magic links are enabled by default

### Customizing the magic link email

1. In the Supabase dashboard, go to **Authentication** → **Email Templates**
2. Select **Magic Link** (used for both sign-up and sign-in when using email)
3. Edit the template. You can change:
   - **Subject** – e.g. `Sign in to [Your App Name]`
   - **Body (HTML)** – Supabase provides variables you can use:
     - `{{ .ConfirmationURL }}` – the link the user must click to sign in
     - `{{ .Email }}` – the user’s email
     - `{{ .Token }}` – the raw token (usually you use `ConfirmationURL` instead)
     - `{{ .TokenHash }}` – hashed token
     - `{{ .SiteURL }}` – value from **URL Configuration** → Site URL
   - **Body (plain text)** – optional; used if the client doesn’t support HTML

4. Example subject: `Sign in to Vellum`
5. Example body snippet:  
   `Click to sign in: {{ .ConfirmationURL }}`  
   Or use HTML for styling; the link must be `{{ .ConfirmationURL }}` so the user is taken to your app and logged in.

6. Click **Save** to apply. New magic link emails will use your template.

### Email rate limits (allow “try again” / correct typo)

Supabase limits how often magic-link emails can be sent (e.g. a 60-second cooldown per user and/or per email). If someone requests a link twice in a row (e.g. wrong email first time), they may hit a rate-limit error. The app shows a friendly message when that happens.

**To allow at least two magic-link requests in a row (e.g. correct a typo):**

1. In the **Supabase Dashboard**, open your project.
2. Go to **Authentication** → **Rate Limits**.
3. Find the **Email** / **OTP** (magic link) limits. You may see:
   - A cooldown (e.g. 60 seconds) before another link can be sent.
   - A cap like “X emails per hour”.
4. **Increase the limit or lower the cooldown** so that two requests within a short time are allowed (e.g. allow 2–3 per minute or reduce the cooldown to ~10–30 seconds). Save changes.

If your project uses **Supabase’s default email (no custom SMTP)**, some limits may be fixed; using **Custom SMTP** (Authentication → Email) can allow higher or configurable limits.  
Details: [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits).

## 5. Set Redirect URLs

In **Authentication** > **URL Configuration**:
- **Site URL**: Your production URL (e.g., `https://yourdomain.com`)
- **Redirect URLs**: Add your local and production URLs:
  - `http://localhost:5175/`
  - `https://yourdomain.com/`

## 6. Run Database Schema

Run the SQL from `../supabase/SUPABASE_COMPLETE_SETUP.sql` in your Supabase SQL editor (or use the migrations in `../supabase/README.md`) to:
- Create the profiles table
- Set up Row Level Security policies
- Create the auto-profile creation trigger

## 7. Test Authentication

1. Start your frontend: `npm run dev`
2. Navigate to `http://localhost:5175`
3. Try signing in with Apple, Google, or Email
4. You should be redirected to the homepage (`/`) after successful authentication

