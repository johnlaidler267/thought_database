import express from 'express'
import dotenv from 'dotenv'
import { TaggingService } from '../services/llm/index.js'

dotenv.config()

const router = express.Router()

// Initialize tagging service
const taggingService = new TaggingService({
  groqApiKey: process.env.GROQ_API_KEY,
  timeout: 10000, // 10 seconds for fast tagging
})

router.post('/', async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    // If service is not configured, return empty tags and mentions (graceful degradation)
    if (!taggingService.isConfigured()) {
      console.warn('Tagging service not configured, returning empty tags and mentions')
      return res.json({ tags: [], mentions: [] })
    }

    // Extract tags and mentions (person names) using Llama via Groq
    const result = await taggingService.extractTags(text)
    const tags = Array.isArray(result.tags) ? result.tags : []
    const mentions = Array.isArray(result.mentions) ? result.mentions : []

    res.json({ tags, mentions })
  } catch (error) {
    console.error('Tag extraction error:', error)
    res.json({ tags: [], mentions: [] })
  }
})

export default router