import express from 'express'
import dotenv from 'dotenv'
import { GroqProvider } from '../services/llm/providers/GroqProvider.js'

dotenv.config()

const router = express.Router()
const MODEL = 'llama-3.1-8b-instant'

const groqProvider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 15000,
})

router.post('/', async (req, res) => {
  try {
    const { intent } = req.body

    if (!intent || typeof intent !== 'string') {
      return res.status(400).json({ error: 'intent is required and must be a string' })
    }

    if (!groqProvider.apiKey) {
      return res.status(503).json({ error: 'Thought starters service not configured' })
    }

    const intentTrimmed = intent.trim()
    const GO_DEEP_INTENT = 'I want to go deep'
    const systemPrompt =
      intentTrimmed === GO_DEEP_INTENT
        ? `You are a sharp, warm thinking companion helping someone examine their own life.
The user wants to go deep.

Generate exactly 5 journaling prompts.

Rules:
- Start from concrete, observable things — behaviors, events, people, decisions — not feelings or abstract concepts
- The insight should emerge from answering, not be assumed upfront
- Each question should have a foothold — something specific the user can grab onto even if they have no self-awareness going in
- Slightly uncomfortable is good. Easy to dodge is bad.
- Under 15 words each
- No numbering, no preamble, return only a JSON array of 5 strings`
        : `You are a gentle, curious thinking companion.
The user has indicated they want to: "${intentTrimmed}".

Generate exactly 5 short, open-ended journaling prompts suited to that intent.

Rules:
- Each prompt should feel like a natural question a thoughtful friend might ask
- Vary the angle — don't ask the same thing 5 different ways
- Keep each prompt under 15 words
- No numbering, no preamble, return only a JSON array of 5 strings`

    const content = await groqProvider.complete(systemPrompt, MODEL, {
      max_tokens: 300,
      temperature: 0.7,
    })

    // Parse JSON array from response (may be wrapped in markdown code block)
    let prompts = []
    const trimmed = (content || '').trim()
    const jsonMatch = trimmed.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        prompts = JSON.parse(jsonMatch[0])
      } catch (e) {
        console.warn('[thought-starters] JSON parse failed:', e.message)
      }
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(500).json({ error: 'Failed to generate prompts' })
    }

    // Ensure we have exactly 5 strings
    const result = prompts
      .slice(0, 5)
      .map((p) => (typeof p === 'string' ? p.trim() : String(p).trim()))
      .filter(Boolean)

    res.json({ prompts: result.length > 0 ? result : [] })
  } catch (error) {
    console.error('Thought starters route error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to generate thought starters' })
  }
})

export default router
