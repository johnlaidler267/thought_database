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
  // Force log to ensure we see this
  console.log('='.repeat(80))
  console.log('🚀 CLEAN ROUTE HIT - POST /clean')
  console.log('📥 Request body:', JSON.stringify(req.body))
  console.log('='.repeat(80))
  
  try {
    const { transcript } = req.body

    if (!transcript) {
      console.error('❌ No transcript provided')
      return res.status(400).json({ error: 'No transcript provided' })
    }

    console.log('📝 Transcript received:', transcript)
    console.log('🔍 Checking if service is configured...')
    console.log('🔑 GOOGLE_AI_API_KEY exists?', !!process.env.GOOGLE_AI_API_KEY)
    console.log('🔑 GOOGLE_AI_API_KEY length:', process.env.GOOGLE_AI_API_KEY?.length || 0)

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
    console.log('Original transcript (full):', transcript)
    console.log('Original transcript length:', transcript.length)
    
    // Clean transcript using Gemini
    let cleanedText
    let cleaningError = null
    
    try {
      cleanedText = await cleaningService.clean(transcript)
    } catch (error) {
      console.error('❌ Error in cleaningService.clean():', error.message || error)
      cleaningError = error.message || 'Unknown error'
      // Fall back to original transcript
      cleanedText = transcript
    }
    
    console.log('📊 Route handler - Cleaned result (full):', cleanedText)
    console.log('📊 Route handler - Cleaned result length:', cleanedText?.length || 0)
    console.log('📊 Route handler - Same as original?', cleanedText === transcript)
    console.log('📊 Route handler - Character-by-character comparison:')
    console.log('  Original:', JSON.stringify(transcript))
    console.log('  Cleaned:', JSON.stringify(cleanedText))
    
    // Warn if cleaning didn't change the text (might indicate an issue)
    if (cleanedText === transcript && transcript.length > 3) {
      console.warn('⚠️ WARNING: Cleaned text is identical to original!')
      console.warn('This suggests cleaning may not be working properly.')
      console.warn('Possible causes:')
      console.warn('  1. Google AI API returned the same text')
      console.warn('  2. An error occurred and original was returned')
      console.warn('  3. The prompt/model needs adjustment')
      if (cleaningError) {
        console.warn('  4. Error occurred:', cleaningError)
      }
    }
    
    res.json({ 
      cleaned_text: cleanedText || transcript,
      cleaned: cleanedText !== transcript,
      original_length: transcript.length,
      cleaned_length: cleanedText?.length || transcript.length,
      error: cleaningError || undefined // Include error if one occurred
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