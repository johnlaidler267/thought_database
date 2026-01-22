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

    // If service is not configured, return empty tags (graceful degradation)
    if (!taggingService.isConfigured()) {
      console.warn('Tagging service not configured, returning empty tags')
      return res.json({ tags: [] })
    }

    // Extract tags using Llama via Groq
    const tags = await taggingService.extractTags(text)
    
    res.json({ tags: Array.isArray(tags) ? tags : [] })
  } catch (error) {
    console.error('Tag extraction error:', error)
    // Graceful degradation - return empty array on error
    res.json({ tags: [] })
  }
})

export default router