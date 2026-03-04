import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { requireAuth } from './middleware/auth.js'
import transcribeRouter from './routes/transcribe.js'
import cleanRouter from './routes/clean.js'
import tagsRouter from './routes/tags.js'
import reflectRouter from './routes/reflect.js'
import distillRouter from './routes/distill.js'
import stripeRouter from './routes/stripe.js'
import peopleRouter from './routes/people.js'
import thoughtStartersRouter from './routes/thoughtStarters.js'
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

// CORS: production requires FRONTEND_URL; allow that origin plus localhost so local dev can use production API
const isProduction = process.env.NODE_ENV === 'production'
const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN

if (isProduction && !frontendUrl) {
  console.error('In production, FRONTEND_URL (or CORS_ORIGIN) must be set. Refusing to start with open CORS.')
  process.exit(1)
}

const allowedOrigins = frontendUrl
  ? [frontendUrl, 'http://localhost:5175', 'http://localhost:5173']
  : true

app.use(cors({
  origin: allowedOrigins,
}))

// Request logging: method + path only in production; add headers in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      origin: req.headers.origin
    })
  }
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
      'POST /api/reflect',
      'POST /api/distill',
      'POST /api/thought-starters',
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

// Health check - no rate limit (for load balancers / monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rate limiting: protect LLM/API endpoints from abuse (per IP)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)

// Protected routes: require valid Supabase JWT
const auth = requireAuth(supabase)
app.use('/api/transcribe', auth, transcribeRouter)
app.use('/api/clean', auth, cleanRouter)
app.use('/api/tags', auth, tagsRouter)
app.use('/api/reflect', auth, reflectRouter)
app.use('/api/distill', auth, distillRouter)
app.use('/api/people', auth, peopleRouter)
app.use('/api/thought-starters', auth, thoughtStartersRouter)
app.use('/api/stripe', auth, stripeRouter)

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
    'POST /api/reflect',
    'POST /api/distill',
    'POST /api/thought-starters',
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
      'POST /api/reflect',
      'POST /api/distill',
      'POST /api/thought-starters',
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
  console.log(`  POST /api/reflect`)
  console.log(`  POST /api/distill`)
  console.log(`  POST /api/stripe/webhook`)
})

