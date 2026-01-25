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
      return res.json({ 
        cleaned_text: transcript,
        cleaned: false,
        reason: 'service_not_configured'
      })
    }

    console.log('✅ Cleaning service configured, cleaning transcript...')
    console.log('Original transcript:', transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''))
    
    // Clean transcript using Gemini
    const cleanedText = await cleaningService.clean(transcript)
    
    console.log('Cleaned result:', cleanedText?.substring(0, 50) + (cleanedText?.length > 50 ? '...' : ''))
    console.log('Same as original?', cleanedText === transcript)
    
    // Warn if cleaning didn't change the text (might indicate an issue)
    if (cleanedText === transcript && transcript.length > 3) {
      console.warn('⚠️ WARNING: Cleaned text is identical to original!')
      console.warn('This suggests cleaning may not be working properly.')
    }
    
    res.json({ 
      cleaned_text: cleanedText || transcript,
      cleaned: cleanedText !== transcript,
      original_length: transcript.length,
      cleaned_length: cleanedText?.length || transcript.length
    })
  } catch (error) {
    console.error('❌ Cleaning route error:', error.message || error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    
    // On timeout or failure, return original transcript instead of failing
    // This ensures the user doesn't lose their data even if cleanup fails
    if (error.message?.includes('timeout')) {
      console.warn('⏱️ Cleaning timed out')
      return res.json({ 
        cleaned_text: req.body.transcript || '',
        cleaned: false,
        reason: 'timeout',
        error: error.message
      })
    }
    
    // Graceful degradation - return original transcript on any error
    console.warn('⚠️ Returning original transcript due to error')
    res.json({ 
      cleaned_text: req.body.transcript || '',
      cleaned: false,
      reason: 'error',
      error: error.message || 'Unknown error'
    })
  }
})

export default router