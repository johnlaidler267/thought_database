import express from 'express'
// import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// })

const CLEANING_PROMPT = `You are a text cleaning assistant. Your task is to clean up spoken transcripts by:

1. Removing filler words ("um", "uh", "like", "you know", etc.)
2. Removing stutters and repetitions
3. Fixing minor grammatical issues from speech
4. Preserving the user's original voice and meaning
5. Keeping the text concise but NOT rewriting it

Important: Do NOT change the core meaning or rewrite the content. Only clean up the speech artifacts.

Return ONLY the cleaned text, no explanations or additional commentary.`

router.post('/', async (req, res) => {
  try {
    const { transcript } = req.body

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' })
    }

    // LLM API timeout (30 seconds)
    const LLM_TIMEOUT_MS = 30000

    // if (!process.env.ANTHROPIC_API_KEY) {
    //   return res.status(500).json({ error: 'Anthropic API key not configured' })
    // }

    // Wrap LLM API call with timeout protection
    // const messagePromise = anthropic.messages.create({
    //   model: 'claude-3-5-sonnet-20241022',
    //   max_tokens: 1024,
    //   messages: [
    //     {
    //       role: 'user',
    //       content: `${CLEANING_PROMPT}\n\nOriginal transcript:\n${transcript}`,
    //     },
    //   ],
    // })

    // const timeoutPromise = new Promise((_, reject) => {
    //   setTimeout(() => {
    //     reject(new Error('LLM API request timed out after 30 seconds'))
    //   }, LLM_TIMEOUT_MS)
    // })

    // try {
    //   const message = await Promise.race([messagePromise, timeoutPromise])
    //   const cleanedText = message.content[0].text.trim()
    //   res.json({ cleaned_text: cleanedText })
    // } catch (error) {
    //   // Handle timeout or API errors gracefully
    //   if (error.message?.includes('timeout')) {
    //     console.error('LLM API timeout:', error.message)
    //     // Return original transcript on timeout - don't fail the request
    //     return res.json({ cleaned_text: transcript })
    //   }
    //   throw error
    // }
    
    // Mock response - simple cleaning simulation
    // In production, this would be replaced with the LLM API call above
    const mockCleaned = transcript
      .replace(/\b(um|uh|like|you know)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    res.json({ cleaned_text: mockCleaned || transcript })
  } catch (error) {
    console.error('Cleaning error:', error)
    
    // On timeout or failure, return original transcript instead of failing
    // This ensures the user doesn't lose their data even if cleanup fails
    if (error.message?.includes('timeout')) {
      return res.json({ cleaned_text: req.body.transcript || '' })
    }
    
    res.status(500).json({ error: 'Failed to clean transcript' })
  }
})

export default router