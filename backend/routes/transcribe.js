import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import { TranscriptionService } from '../services/llm/index.js'

dotenv.config()

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// Initialize transcription service
const transcriptionService = new TranscriptionService({
  groqApiKey: process.env.GROQ_API_KEY,
  timeout: 300000, // 5 minutes
})

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Audio file is empty' })
    }

    // Backend validation: File size limit (50MB as safety net)
    const MAX_FILE_SIZE_MB = 50
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    if (req.file.buffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ 
        error: 'Audio file too large',
        details: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please record shorter audio segments.`
      })
    }

    console.log(`📥 Received audio: ${req.file.buffer.length} bytes, type: ${req.file.mimetype}`)

    // Check if service is configured
    if (!transcriptionService.isConfigured()) {
      console.warn('⚠️ Transcription service not configured')
      console.warn('GROQ_API_KEY exists?', !!process.env.GROQ_API_KEY)
      console.warn('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0)
      return res.status(503).json({ 
        error: 'Transcription service not configured',
        details: 'GROQ_API_KEY is required for transcription'
      })
    }

    console.log('✅ Transcription service configured, starting transcription...')

    // Transcribe using Groq Whisper API
    const transcriptText = await transcriptionService.transcribe(
      req.file.buffer,
      req.file.mimetype
    )
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Transcription returned empty result',
        details: 'The audio was processed but no text was generated'
      })
    }
    
    res.json({ transcript: transcriptText })
  } catch (error) {
    console.error('Transcription error:', error)
    const statusCode = error.message?.includes('timeout') ? 504 : 
                      error.message?.includes('API key') ? 503 : 500
    res.status(statusCode).json({ 
      error: error.message || 'Failed to transcribe audio',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

export default router