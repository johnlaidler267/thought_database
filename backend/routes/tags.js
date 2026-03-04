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
    const { text, existingTagVocabulary } = req.body

    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    const vocabulary = Array.isArray(existingTagVocabulary) ? existingTagVocabulary : []

    // If service is not configured, return empty tags and mentions (graceful degradation)
    if (!taggingService.isConfigured()) {
      console.warn('Tagging service not configured, returning empty tags and mentions')
      return res.json({ tags: [], mentions: [], key_points: {}, thought_type: null })
    }

    // Extract tags (suggestions from shared vocabulary), mentions, key_points, and thought_type using Llama via Groq
    const result = await taggingService.extractTags(text, vocabulary)
    const tags = Array.isArray(result.tags) ? result.tags : []
    const mentions = Array.isArray(result.mentions) ? result.mentions : []
    const key_points = typeof result.key_points === 'object' ? result.key_points : {}
    const thought_type = result.thought_type ?? null

    res.json({ tags, mentions, key_points, thought_type })
  } catch (error) {
    console.error('Tag extraction error:', error)
    res.json({ tags: [], mentions: [], key_points: {}, thought_type: null })
  }
})

export default router