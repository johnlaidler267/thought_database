import express from 'express'
import dotenv from 'dotenv'
import { CleaningService } from '../services/llm/index.js'

dotenv.config()

const router = express.Router()

// Initialize cleaning service
const cleaningService = new CleaningService({
  googleApiKey: process.env.GOOGLE_AI_API_KEY,
  timeout: 30000, // 30 seconds
})

router.post('/', async (req, res) => {
  try {
    const { transcript } = req.body

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' })
    }

    // If service is not configured, return original transcript (graceful degradation)
    if (!cleaningService.isConfigured()) {
      console.warn('Cleaning service not configured - GOOGLE_AI_API_KEY missing or invalid')
      return res.json({ 
        cleaned_text: transcript,
        cleaned: false,
        reason: 'service_not_configured'
      })
    }
    
    // Clean transcript using Gemini
    let cleanedText
    let cleaningError = null
    
    try {
      cleanedText = await cleaningService.clean(transcript)
    } catch (error) {
      console.error('Error in cleaningService.clean():', error.message)
      cleaningError = error.message || 'Unknown error'
      // Fall back to original transcript
      cleanedText = transcript
    }
    
    res.json({ 
      cleaned_text: cleanedText || transcript,
      cleaned: cleanedText !== transcript,
      original_length: transcript.length,
      cleaned_length: cleanedText?.length || transcript.length,
      error: cleaningError || undefined
    })
  } catch (error) {
    console.error('Cleaning route error:', error.message)
    
    // On timeout or failure, return original transcript instead of failing
    if (error.message?.includes('timeout')) {
      return res.json({ 
        cleaned_text: req.body.transcript || '',
        cleaned: false,
        reason: 'timeout',
        error: error.message
      })
    }
    
    // Graceful degradation - return original transcript on any error
    res.json({ 
      cleaned_text: req.body.transcript || '',
      cleaned: false,
      reason: 'error',
      error: error.message || 'Unknown error'
    })
  }
})

export default router