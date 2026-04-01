import express from 'express'
import dotenv from 'dotenv'
import { GroqProvider } from '../services/llm/providers/GroqProvider.js'

dotenv.config()

const router = express.Router()

const REWRITE_MODEL = 'llama-3.1-8b-instant'

const groqProvider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 20000,
})

const REWRITE_INSTRUCTION =
  'Rewrite the following text so it is maximally clear, precise, and easy to understand. ' +
  'Preserve the author\'s meaning and intent. Do not shorten for brevity alone — prioritize clarity, good structure, and natural flow. ' +
  'Fix awkward phrasing, unclear references, and grammar where needed. Do not add new ideas, commentary, or a title. ' +
  'Keep roughly similar length unless the original is bloated with redundancy.'

const OUTPUT_ONLY_INSTRUCTION =
  'Return only the rewritten text. No preamble, no explanation, no quotation marks, no labels — just the text.'

function stripPreamble(str) {
  if (!str || typeof str !== 'string') return str
  let s = str.trim()
  const preambleMatch = s.match(/^Here(?:'s|\s+is|\s+are)\s+[^:]+:\s*/i)
  if (preambleMatch) {
    s = s.slice(preambleMatch[0].length).trim()
  }
  return s
}

router.post('/', async (req, res) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required and must be a string' })
    }

    if (!groqProvider.apiKey) {
      return res.status(503).json({ error: 'Rewrite service not configured' })
    }

    const prompt = `${REWRITE_INSTRUCTION}\n\n---\n\n${text.trim()}\n\n${OUTPUT_ONLY_INSTRUCTION}`

    const result = await groqProvider.complete(prompt, REWRITE_MODEL, {
      max_tokens: 2048,
      temperature: 0.35,
    })

    let rewritten = (result || '').trim()
    rewritten = stripPreamble(rewritten) || rewritten
    res.json({ rewritten_text: rewritten || text.trim() })
  } catch (error) {
    console.error('Rewrite route error:', error.message)
    res.status(500).json({ error: error.message || 'Failed to rewrite' })
  }
})

export default router
