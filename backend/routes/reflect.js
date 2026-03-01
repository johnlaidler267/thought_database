import express from 'express'
import dotenv from 'dotenv'
import { GroqProvider } from '../services/llm/providers/GroqProvider.js'

dotenv.config()

const router = express.Router()

const REFLECT_MODEL = 'llama-3.1-8b-instant'

const groqProvider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 15000,
})

router.post('/', async (req, res) => {
  try {
    const { thoughtText, followUps } = req.body

    if (!thoughtText || typeof thoughtText !== 'string') {
      return res.status(400).json({ error: 'thoughtText is required and must be a string' })
    }

    const followUpsList = Array.isArray(followUps) ? followUps : []
    const followUpsText = followUpsList
      .map((fu) => (typeof fu === 'string' ? fu : fu?.text))
      .filter(Boolean)
      .join('\n')

    const context = followUpsText
      ? `Thought:\n${thoughtText.trim()}\n\nFollow-ups:\n${followUpsText}`
      : thoughtText.trim()

    if (!groqProvider.apiKey) {
      return res.status(503).json({ error: 'Reflect service not configured' })
    }

    const systemPrompt = 'Given this thought and any follow-ups, ask a single short, probing follow-up question that will provoke deeper reflection. Return only the question, nothing else.'
    const userMessage = context

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`

    const question = await groqProvider.complete(fullPrompt, REFLECT_MODEL, {
      max_tokens: 150,
      temperature: 0.6,
    })

    const trimmed = (question || '').trim().replace(/^["']|["']$/g, '')
    res.json({ question: trimmed || null })
  } catch (error) {
    console.error('Reflect route error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to generate reflection question' })
  }
})

export default router
