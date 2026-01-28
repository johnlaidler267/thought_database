# Stripe Integration Guide

This document outlines the steps to complete the Stripe subscription integration for the Thought Database project.

## Overview

The integration allows users to:
1. Click "Upgrade to Pro" to purchase a subscription via Stripe Checkout
2. After purchase, the button changes to "Manage Subscription"
3. Clicking "Manage Subscription" opens the Stripe Customer Portal where users can cancel their subscription

## Implementation Status

✅ **Completed:**
- Backend Stripe routes with Supabase integration
- Webhook handler for subscription events
- Checkout session creation with customer linking
- Subscription status endpoint
- Frontend checkout success handling
- UI updates for subscription management

## Setup Steps

### 1. Install Dependencies

The backend already has the required dependencies. If you need to reinstall:

```bash
cd thought_database/backend
npm install
```

This will install:
- `stripe` - Stripe SDK
- `@supabase/supabase-js` - Supabase client for backend

### 2. Environment Variables

Add the following environment variables to your backend `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret from Stripe Dashboard

# Supabase Configuration (for backend database operations)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # NOT the anon key - needs service role for backend operations

# Frontend URL (optional, defaults to localhost:5173)
FRONTEND_URL=http://localhost:5173
```

**Important:** 
- Use the **Service Role Key** for `SUPABASE_SERVICE_ROLE_KEY`, not the anon key. This is required for the backend to update user profiles.
- The Service Role Key bypasses Row Level Security, so keep it secure and never expose it to the frontend.

### 3. Database Schema

Ensure your Supabase database has the updated schema. Run the SQL from `SUPABASE_PROFILES_SCHEMA_UPDATE.sql` in your Supabase SQL editor if you haven't already:

```sql
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'trial' CHECK (tier IN ('trial', 'sovereign', 'apprentice', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
```

### 4. Stripe Dashboard Setup

#### Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Create a product "Axiom " with a recurring monthly price of $12.00
3. (Optional) Create "Axiom Apprentice" with a recurring monthly price of $5.00

**Note:** The current implementation uses `price_data` in the checkout session, which creates prices on-the-fly. For production, consider creating fixed Price IDs in Stripe and using them instead.

#### Configure Customer Portal

1. Go to Stripe Dashboard → Settings → Billing → Customer portal
2. Enable the Customer Portal
3. Configure what customers can do:
   - ✅ Cancel subscriptions
   - ✅ Update payment methods
   - ✅ View invoices
   - ✅ Update billing information

#### Set Up Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-backend-url.com/api/stripe/webhook`
   - For local development, use a tool like [ngrok](https://ngrok.com) to expose your local server
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`) and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

### 5. Testing

#### Test Mode

1. Use Stripe test mode keys (start with `sk_test_`)
2. Use test card numbers from [Stripe Testing](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Test the flow:
   - Click "Upgrade to Pro" → Should redirect to Stripe Checkout
   - Complete checkout with test card
   - Should redirect back to settings with subscription active
   - Click "Manage Subscription" → Should open Customer Portal
   - Cancel subscription in portal
   - Should update profile back to trial tier

#### Webhook Testing

For local development, use ngrok:

```bash
# Install ngrok (if not installed)
# Then expose your local server
ngrok http 3001

# Use the ngrok URL in Stripe webhook configuration
# Example: https://abc123.ngrok.io/api/stripe/webhook
```

You can also use Stripe CLI for local webhook testing:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## How It Works

### Checkout Flow

1. User clicks "Upgrade to Pro" in Settings
2. Frontend calls `/api/stripe/create-checkout-session` with userId and email
3. Backend:
   - Checks if user has existing Stripe customer ID
   - Creates customer if needed and saves to database
   - Creates Stripe Checkout session
   - Returns checkout URL
4. User is redirected to Stripe Checkout
5. After payment, Stripe redirects to `/settings?session_id={CHECKOUT_SESSION_ID}`
6. Frontend detects `session_id` in URL and calls `/api/stripe/verify-session`
7. Backend verifies session and updates user profile with subscription details
8. Frontend refreshes profile to show updated subscription status

### Subscription Management

1. User clicks "Manage Subscription"
2. Frontend calls `/api/stripe/create-portal-session` with customer ID
3. Backend creates Stripe Customer Portal session
4. User is redirected to Stripe Customer Portal
5. User can cancel subscription, update payment method, etc.
6. Stripe sends webhook events when subscription changes
7. Backend webhook handler updates database accordingly

### Webhook Events

The webhook handler processes three key events:

- **`checkout.session.completed`**: When checkout is completed, updates user profile with subscription details
- **`customer.subscription.updated`**: When subscription status changes (e.g., payment fails, reactivated)
- **`customer.subscription.deleted`**: When subscription is canceled, resets user to trial tier

## API Endpoints

### POST `/api/stripe/create-checkout-session`
Creates a Stripe Checkout session for subscription purchase.

**Request:**
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "tier": "pro"  // or "apprentice"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST `/api/stripe/create-portal-session`
Creates a Stripe Customer Portal session for subscription management.

**Request:**
```json
{
  "customerId": "cus_..."
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET `/api/stripe/subscription-status/:userId`
Checks the subscription status for a user.

**Response:**
```json
{
  "hasSubscription": true,
  "customerId": "cus_...",
  "subscriptionId": "sub_...",
  "tier": "pro"
}
```

### POST `/api/stripe/verify-session`
Verifies a checkout session after successful payment (called by frontend).

**Request:**
```json
{
  "sessionId": "cs_test_..."
}
```

**Response:**
```json
{
  "success": true,
  "tier": "pro",
  "customerId": "cus_...",
  "subscriptionId": "sub_..."
}
```

### POST `/api/stripe/webhook`
Stripe webhook endpoint (called by Stripe, not directly by frontend).

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures using `STRIPE_WEBHOOK_SECRET`
2. **Service Role Key**: Never expose the Supabase Service Role Key to the frontend
3. **Environment Variables**: Keep all secrets in `.env` and never commit them
4. **HTTPS**: Use HTTPS in production for webhook endpoints
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## Troubleshooting

### Webhook Not Receiving Events

1. Check that webhook URL is correct and accessible
2. Verify webhook secret is correct in `.env`
3. Check Stripe Dashboard → Webhooks → Events for delivery status
4. Check backend logs for webhook errors

### Subscription Not Updating After Purchase

1. Check that webhook is configured correctly
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Check database permissions for the service role
4. Check backend logs for errors

### Customer Portal Not Opening

1. Verify Customer Portal is enabled in Stripe Dashboard
2. Check that `customerId` is correct
3. Ensure customer exists in Stripe

## Next Steps

- [ ] Add subscription tier checks to feature gating (e.g., limit transcriptions for trial users)
- [ ] Add email notifications for subscription events
- [ ] Implement usage tracking and limits per tier
- [ ] Add subscription upgrade/downgrade flows
- [ ] Add analytics for subscription conversions

