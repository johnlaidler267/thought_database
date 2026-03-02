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

const OUTPUT_ONLY_INSTRUCTION =
  'Return only the distilled text itself. No preamble, no explanation, no quotation marks, no labels — just the text.'

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

/** Strip common LLM preamble patterns (e.g. "Here's a distilled version: ...") and return only the content. */
function stripPreamble(str) {
  if (!str || typeof str !== 'string') return str
  let s = str.trim()
  // Match "Here's ..." or "Here is ..." or "Here are ..." up to and including the colon
  const preambleMatch = s.match(/^Here(?:'s|\s+is|\s+are)\s+[^:]+:\s*/i)
  if (preambleMatch) {
    s = s.slice(preambleMatch[0].length).trim()
  }
  return s
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

    const prompt = `${instruction}\n\n---\n\n${text.trim()}\n\n${OUTPUT_ONLY_INSTRUCTION}`

    const result = await groqProvider.complete(prompt, DISTILL_MODEL, {
      max_tokens: 300,
      temperature: 0.3,
    })

    let distilled = (result || '').trim()
    distilled = stripPreamble(distilled) || distilled
    res.json({ distilled_text: distilled || text.trim() })
  } catch (error) {
    console.error('Distill route error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to distill' })
  }
})

export default router
