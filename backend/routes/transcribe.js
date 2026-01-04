import express from 'express'
import multer from 'multer'
// import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    // if (!process.env.OPENAI_API_KEY) {
    //   return res.status(500).json({ error: 'OpenAI API key not configured' })
    // }

    // // Create a File-like object for OpenAI SDK
    // // In Node.js, we need to create a File from the buffer
    // const audioFile = new File([req.file.buffer], req.file.originalname || 'recording.webm', {
    //   type: req.file.mimetype || 'audio/webm',
    // })

    // const transcription = await openai.audio.transcriptions.create({
    //   file: audioFile,
    //   model: 'whisper-1',
    //   language: 'en',
    //   response_format: 'json',
    // })

    // res.json({ transcript: transcription.text })
    
    // Mock response for UI testing
    res.json({ transcript: 'This is a mock transcript. API keys not configured yet.' })
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Failed to transcribe audio' })
  }
})

export default router