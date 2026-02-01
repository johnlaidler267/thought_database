# Google OAuth Setup Guide

This guide walks you through setting up "Continue with Google" login for your application.

## Prerequisites

- A Google account
- A Supabase project (already set up)
- Your Supabase project URL (e.g., `https://your-project.supabase.co`)

## Step 1: Create OAuth Credentials in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cl    oud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "Thought Notary")
   - Click "Create"

3. **Enable Google+ API**
   - In the left sidebar, go to **APIs & Services** > **Library**
   - Search for "Google+ API" or "People API"
   - Click on it and click **Enable**

4. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** > **     **
   - Choose **External** (unless you have a Google Workspace account)
   - Click **Create**
   - Fill in the required information:
     - **App name**: Your app name (e.g., "Thought Notary")
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **Save and Continue**
   - On the **Scopes** page, click **Save and Continue** (default scopes are fine)
   - On the **Test users** page (if in testing mode), you can add test users or skip
   - Click **Save and Continue**
   - Review and click **Back to Dashboard**

5. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **+ Create Credentials** > **OAuth client ID**
   - Choose **Web application** as the application type
   - Give it a name (e.g., "Thought Notary Web Client")
   - **Authorized redirect URIs**: Add your Supabase callback URL:
     ```
     https://wprgbbfrybnirtvyntyr.supabase.co/auth/v1/callback
     ```
     - Replace `your-project-id` with your actual Supabase project ID
     - You can find your project ID in your Supabase dashboard URL or in Project Settings > API
   - Click **Create**
   - **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these in the next step
     - ⚠️ Keep these secure and never commit them to version control

## Step 2: Configure Google Provider in Supabase

1. **Go to Supabase Dashboard**
   - Visit [Supabase Dashboard](https://app.supabase.com/)
   - Select your project

2. **Enable Google Provider**
   - Go to **Authentication** > **Providers**
   - Find **Google** in the list
   - Toggle it to **Enabled**

3. **Add Google Credentials**
   - Click on **Google** to expand the configuration
   - Paste your **Client ID** from Google Cloud Console
   - Paste your **Client Secret** from Google Cloud Console
   - Click **Save**

## Step 3: Configure Redirect URLs in Supabase

1. **Go to URL Configuration**
   - In Supabase Dashboard, go to **Authentication** > **URL Configuration**

2. **Set Site URL**
   - **Site URL**: Your production URL (e.g., `https://yourdomain.com`)
   - For local development, you can use: `http://localhost:5175`

3. **Add Redirect URLs**
   - In the **Redirect URLs** section, click **Add URL**
   - Add your local development URL:
     ```
     http://localhost:5175/
     ```
   - Add your production URL (when ready):
     ```
     https://yourdomain.com/
     ```
   - Click **Save**

## Step 4: Verify Environment Variables

Make sure your frontend has the Supabase credentials in `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in Supabase Dashboard > **Project Settings** > **API**.

## Step 5: Test Google Login

1. **Start your development server**
   ```bash
   cd thought_database/frontend
   npm run dev
   ```

2. **Test the login**
   - Navigate to `http://localhost:5175`
   - Click "Continue with Google"
   - You should be redirected to Google's sign-in page
   - After signing in, you should be redirected back to the homepage (`/`)

## Troubleshooting

### "Redirect URI mismatch" error

- **Problem**: The redirect URI in Google Cloud Console doesn't match Supabase's callback URL
- **Solution**: 
  - Make sure you added `https://your-project-id.supabase.co/auth/v1/callback` in Google Cloud Console
  - The project ID must match exactly (check in Supabase Dashboard > Settings > API)

### "OAuth client not found" error

- **Problem**: Client ID or Client Secret is incorrect
- **Solution**: 
  - Double-check you copied the correct values from Google Cloud Console
  - Make sure there are no extra spaces
  - Verify the credentials are saved in Supabase Dashboard

### User not redirected after login

- **Problem**: Redirect URLs not configured correctly
- **Solution**:
  - Check that `/` (homepage) is in the Redirect URLs list in Supabase
  - Verify the `redirectTo` in your code matches: `${window.location.origin}/`

### "Access blocked: This app's request is invalid" error

- **Problem**: OAuth consent screen not properly configured or app is in testing mode
- **Solution**:
  - Make sure you completed the OAuth consent screen setup
  - If in testing mode, add your email as a test user in Google Cloud Console
  - For production, you'll need to submit your app for verification

## Production Considerations

1. **Publish Your App** (when ready for production):
   - In Google Cloud Console, go to **OAuth consent screen**
   - Click **Publish App**
   - This makes it available to all users (not just test users)

2. **Add Production Redirect URLs**:
   - Add your production domain to both:
     - Google Cloud Console (Authorized redirect URIs)
     - Supabase (Redirect URLs)

3. **Verify Your Domain** (optional but recommended):
   - In Google Cloud Console, you can verify your domain for better security

## Security Best Practices

- ✅ Never commit OAuth credentials to version control
- ✅ Use environment variables for all sensitive data
- ✅ Regularly rotate your OAuth credentials
- ✅ Monitor OAuth usage in Google Cloud Console
- ✅ Use HTTPS in production (required for OAuth)

## Next Steps

Once Google login is working:
- Test the full authentication flow
- Verify user profiles are created automatically
- Test that users can access protected routes
- Consider adding additional OAuth providers (Apple, GitHub, etc.)

