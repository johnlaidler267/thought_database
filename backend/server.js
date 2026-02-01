import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import transcribeRouter from './routes/transcribe.js'
import cleanRouter from './routes/clean.js'
import tagsRouter from './routes/tags.js'
import stripeRouter from './routes/stripe.js'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Stripe and Supabase for webhook
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

// CORS: if FRONTEND_URL or CORS_ORIGIN is set (e.g. on Render), allow that origin + localhost; else allow all
const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN
app.use(cors({
  origin: frontendUrl
    ? [frontendUrl, 'http://localhost:5175', 'http://localhost:5173']
    : true,
}))

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  console.log(`  Headers:`, {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    origin: req.headers.origin
  })
  next()
})

// Root endpoint - register early to ensure it's caught
app.get('/', (req, res) => {
  console.log('Root endpoint hit - GET /')
  res.json({ 
    message: 'Thought Database API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/health',
      'POST /api/transcribe',
      'POST /api/clean',
      'POST /api/tags',
      'POST /api/stripe/webhook'
    ]
  })
})

// Stripe webhook endpoint - must be before express.json() middleware
// This endpoint needs raw body for signature verification
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set, skipping webhook verification')
    return res.status(400).json({ error: 'Webhook secret not configured' })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId
          const customerId = session.customer
          const subscriptionId = session.subscription

          if (userId && customerId && subscriptionId && supabase) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const tier = session.metadata?.tier || 'pro'
            const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString()

            await supabase
              .from('profiles')
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                tier: tier,
                next_billing_date: nextBillingDate,
              })
              .eq('id', userId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        if (supabase) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (profile) {
            const updates = {}
            
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              updates.next_billing_date = new Date(subscription.current_period_end * 1000).toISOString()
            } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
              // Subscription canceled or failed, reset to trial
              updates.tier = 'trial'
              updates.stripe_subscription_id = null
              updates.next_billing_date = null
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id)
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        if (supabase) {
          await supabase
            .from('profiles')
            .update({
              tier: 'trial',
              stripe_subscription_id: null,
              next_billing_date: null,
            })
            .eq('stripe_subscription_id', subscription.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    res.status(500).json({ error: error.message })
  }
})

// Now apply JSON middleware for all other routes
app.use(express.json())

// Routes
app.use('/api/transcribe', transcribeRouter)
app.use('/api/clean', cleanRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/stripe', stripeRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Catch-all for 404s - log what was requested
// Must be last, after all other routes
app.use((req, res) => {
  console.error(`404 - Route not found: ${req.method} ${req.originalUrl}`)
  console.error('Available routes:', [
    'GET /',
    'GET /api/health',
    'POST /api/transcribe',
    'POST /api/clean',
    'POST /api/tags',
    'POST /api/stripe/webhook'
  ])
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/transcribe',
      'POST /api/clean',
      'POST /api/tags',
      'POST /api/stripe/webhook'
    ]
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Available routes:`)
  console.log(`  GET  /`)
  console.log(`  GET  /api/health`)
  console.log(`  POST /api/transcribe`)
  console.log(`  POST /api/clean`)
  console.log(`  POST /api/tags`)
  console.log(`  POST /api/stripe/webhook`)
})

