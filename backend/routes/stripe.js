import express from 'express'
import Stripe from 'stripe'

const router = express.Router()

// Initialize Stripe (will be undefined if STRIPE_SECRET_KEY is not set)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// Create Stripe Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  try {
    const { userId, email, tier } = req.body

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' })
    }

    // Determine price based on tier (default to 'pro' for "Upgrade to Pro" button)
    let unitAmount, productName, description
    if (tier === 'apprentice') {
      unitAmount = 500 // $5.00 in cents
      productName = 'Axiom Apprentice'
      description = '300 minutes per month'
    } else {
      // Default to Pro tier
      unitAmount = 1200 // $12.00 in cents
      productName = 'Axiom Notary Pro'
      description = 'Unlimited notarizations'
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
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
      success_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
      customer_email: email,
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
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  try {
    const { customerId } = req.body

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
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
      subscriptionId: null
    })
  }

  try {
    const { userId } = req.params

    // In a real implementation, you would:
    // 1. Look up the Stripe customer ID from your database using userId
    // 2. Check if they have an active subscription
    // For now, this is a placeholder that returns false
    
    // TODO: Implement database lookup for customerId based on userId
    // const customerId = await getCustomerIdFromDatabase(userId)
    // const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active' })
    
    res.json({ 
      hasSubscription: false,
      customerId: null,
      subscriptionId: null
    })
  } catch (error) {
    console.error('Error checking subscription status:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

