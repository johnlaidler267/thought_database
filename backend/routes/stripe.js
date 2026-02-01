import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// Initialize Stripe (will be undefined if STRIPE_SECRET_KEY is not set)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// Initialize Supabase client for backend operations
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

// Create Stripe Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  // Validate input first
  const { userId, email, tier } = req.body

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' })
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  try {

    // Check if user already has a Stripe customer ID
    let customerId = null
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()
      
      customerId = profile?.stripe_customer_id || null
    }

    // If no customer ID exists, create a new Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)
      }
    }

    // Determine price based on tier (default to 'pro' for "Upgrade to Pro" button)
    let unitAmount, productName, description
    if (tier === 'apprentice') {
      unitAmount = 500 // $5.00 in cents
      productName = 'Vellum Apprentice'
      description = '300 minutes per month'
    } else {
      // Default to Pro tier
      unitAmount = 1200 // $12.00 in cents
      productName = 'Vellum Notary Pro'
      description = 'Unlimited notarizations'
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: description,
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5175'}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5175'}/settings`,
      metadata: {
        userId: userId,
        tier: tier || 'pro',
      },
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create Stripe Customer Portal Session
router.post('/create-portal-session', async (req, res) => {
  // Validate input first
  const { customerId } = req.body

  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required' })
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  try {

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5175'}/settings`,
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Check subscription status
router.get('/subscription-status/:userId', async (req, res) => {
  if (!stripe) {
    // In development, return mock data
    return res.json({ 
      hasSubscription: false,
      customerId: null,
      subscriptionId: null,
      tier: null
    })
  }

  try {
    const { userId } = req.params

    // Look up the Stripe customer ID from database
    let customerId = null
    let subscriptionId = null
    let tier = null

    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id, tier')
        .eq('id', userId)
        .single()
      
      if (profile) {
        customerId = profile.stripe_customer_id
        subscriptionId = profile.stripe_subscription_id
        tier = profile.tier
      }
    }

    // If we have a customer ID, verify subscription status with Stripe
    let hasSubscription = false
    if (customerId && subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        hasSubscription = subscription.status === 'active' || subscription.status === 'trialing'
      } catch (error) {
        // Subscription might not exist in Stripe, treat as no subscription
        console.error('Error retrieving subscription:', error)
      }
    }

    res.json({ 
      hasSubscription,
      customerId,
      subscriptionId,
      tier
    })
  } catch (error) {
    console.error('Error checking subscription status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify checkout session (called after successful checkout)
router.post('/verify-session', async (req, res) => {
  // Validate input first
  const { sessionId } = req.body

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' })
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  try {

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    if (session.payment_status === 'paid' && session.mode === 'subscription') {
      const userId = session.metadata?.userId
      const customerId = session.customer
      const subscriptionId = session.subscription

      if (userId && customerId && subscriptionId && supabase) {
        // Get subscription details to determine tier and billing date
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const tier = session.metadata?.tier || 'pro'
        const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString()

        // Update user profile in database
        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier: tier,
            next_billing_date: nextBillingDate,
          })
          .eq('id', userId)

        res.json({ 
          success: true,
          tier,
          customerId,
          subscriptionId
        })
      } else {
        res.status(400).json({ error: 'Missing required session data' })
      }
    } else {
      res.status(400).json({ error: 'Session not paid or not a subscription' })
    }
  } catch (error) {
    console.error('Error verifying session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete user account (cancels subscription and deletes user)
router.post('/delete-account', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is not configured' })
    }

    // Verify user exists before attempting deletion
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !authUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get user profile to check for subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
    }

    // Cancel Stripe subscription if one exists
    if (stripe && profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id)
        console.log(`Cancelled subscription ${profile.stripe_subscription_id} for user ${userId}`)
      } catch (stripeError) {
        // Log but don't fail - subscription might already be cancelled
        console.warn('Error cancelling subscription:', stripeError.message)
      }
    }

    // Delete user from Supabase Auth (this will cascade delete profile and thoughts)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return res.status(500).json({ error: 'Failed to delete user account' })
    }

    console.log(`Successfully deleted account for user ${userId}`)
    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error deleting account:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

