import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import { TranscriptionService } from '../services/llm/index.js'

dotenv.config()

const router = express.Router()
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB for other fields
  }
})

// Initialize transcription service
const transcriptionService = new TranscriptionService({
  groqApiKey: process.env.GROQ_API_KEY,
  timeout: 300000, // 5 minutes
})

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('[TRANSCRIBE] No file in request')
      return res.status(400).json({ error: 'No audio file provided' })
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('[TRANSCRIBE] File buffer is empty')
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

    // Validate buffer is a proper Buffer
    let audioBuffer = req.file.buffer
    if (!Buffer.isBuffer(audioBuffer)) {
      console.error('[TRANSCRIBE] Audio buffer is not a Buffer:', typeof audioBuffer, audioBuffer?.constructor?.name)
      audioBuffer = Buffer.from(audioBuffer)
    }

    // Check if service is configured
    if (!transcriptionService.isConfigured()) {
      console.warn('[TRANSCRIBE] Transcription service not configured - GROQ_API_KEY missing or invalid')
      return res.status(503).json({ 
        error: 'Transcription service not configured',
        details: 'GROQ_API_KEY is required for transcription'
      })
    }

    // Transcribe using Groq Whisper API
    const transcriptText = await transcriptionService.transcribe(
      audioBuffer,
      req.file.mimetype
    )
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      console.warn('[TRANSCRIBE] Empty transcript returned')
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