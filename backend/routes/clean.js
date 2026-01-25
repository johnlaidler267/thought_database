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
      console.warn('⚠️ Cleaning service not configured - GOOGLE_AI_API_KEY missing or invalid')
      console.warn('GOOGLE_AI_API_KEY exists?', !!process.env.GOOGLE_AI_API_KEY)
      console.warn('GOOGLE_AI_API_KEY length:', process.env.GOOGLE_AI_API_KEY?.length || 0)
      return res.json({ cleaned_text: transcript })
    }

    console.log('✅ Cleaning service configured, cleaning transcript...')
    console.log('Original transcript:', transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''))
    
    // Clean transcript using Gemini
    const cleanedText = await cleaningService.clean(transcript)
    
    console.log('Cleaned result:', cleanedText?.substring(0, 50) + (cleanedText?.length > 50 ? '...' : ''))
    console.log('Same as original?', cleanedText === transcript)
    
    res.json({ cleaned_text: cleanedText || transcript })
  } catch (error) {
    console.error('Cleaning error:', error)
    
    // On timeout or failure, return original transcript instead of failing
    // This ensures the user doesn't lose their data even if cleanup fails
    if (error.message?.includes('timeout')) {
      return res.json({ cleaned_text: req.body.transcript || '' })
    }
    
    // Graceful degradation - return original transcript on any error
    res.json({ cleaned_text: req.body.transcript || '' })
  }
})

export default router