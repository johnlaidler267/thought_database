import express from 'express'
import dotenv from 'dotenv'
import { GroqProvider } from '../services/llm/providers/GroqProvider.js'

dotenv.config()

const router = express.Router()

const DISTILL_MODEL = 'llama-3.1-8b-instant'

const groqProvider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 20000,
})

function getDistillInstruction(level) {
  if (level === 1) {
    return 'Lightly clean up and tighten this thought. Remove filler and redundancy but preserve the full meaning and voice.'
  }
  if (level === 2) {
    return 'Condense this to the essential idea in 2–3 sentences. Keep the core insight, drop the rest.'
  }
  if (level === 3) {
    return 'Reduce this to a single sharp sentence that captures the core concept.'
  }
  return 'Distill this to a concise phrase or title — the purest expression of the idea.'
}

router.post('/', async (req, res) => {
  try {
    const { text, level } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required and must be a string' })
    }

    const safeLevel = Math.max(1, parseInt(level, 10) || 1)
    const instruction = getDistillInstruction(safeLevel)

    if (!groqProvider.apiKey) {
      return res.status(503).json({ error: 'Distill service not configured' })
    }

    const prompt = `${instruction}\n\n---\n\n${text.trim()}`

    const result = await groqProvider.complete(prompt, DISTILL_MODEL, {
      max_tokens: 300,
      temperature: 0.3,
    })

    const distilled = (result || '').trim()
    res.json({ distilled_text: distilled || text.trim() })
  } catch (error) {
    console.error('Distill route error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to distill' })
  }
})

export default router
