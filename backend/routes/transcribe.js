import express from 'express'
import multer from 'multer'
import { pipeline } from '@xenova/transformers'
import dotenv from 'dotenv'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import fs from 'fs'
import path from 'path'
import os from 'os'

dotenv.config()

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}


// Initialize Whisper model (lazy loading - only loads when first used)
let transcriber = null

async function getTranscriber() {
  if (!transcriber) {
    console.log('Loading Whisper model (first time may take a moment to download)...')
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base', // Options: tiny, base, small, medium, large
      {
        device: 'cpu', // Use CPU (set to 'cuda' if you have GPU support)
      }
    )
    console.log('Whisper model loaded successfully')
  }
  return transcriber
}

// Convert audio buffer to raw PCM format that Whisper can process
async function convertAudioToRaw(audioBuffer, mimeType) {
  const tempDir = os.tmpdir()
  const inputPath = path.join(tempDir, `input-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`)
  const outputPath = path.join(tempDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}.raw`)
  
  return new Promise((resolve, reject) => {
    try {
      // Write input buffer to temp file
      fs.writeFileSync(inputPath, audioBuffer)
      
      // Use ffmpeg to convert to raw PCM (16-bit, 16kHz, mono) - Whisper's expected format
      ffmpeg(inputPath)
        .audioFrequency(16000) // 16kHz sample rate
        .audioChannels(1)      // Mono
        .audioCodec('pcm_s16le') // 16-bit PCM
        .format('s16le')
        .output(outputPath)
        .on('end', () => {
          try {
            // Read the raw audio data
            const rawAudioData = fs.readFileSync(outputPath)
            
            if (rawAudioData.length === 0) {
              throw new Error('FFmpeg produced empty audio file')
            }
            
            // Convert to Float32Array (normalized to -1.0 to 1.0)
            const samples = new Float32Array(rawAudioData.length / 2)
            const int16Array = new Int16Array(rawAudioData.buffer, rawAudioData.byteOffset, rawAudioData.length / 2)
            
            for (let i = 0; i < samples.length; i++) {
              samples[i] = int16Array[i] / 32768.0
            }
            
            // Clean up temp files
            fs.unlinkSync(inputPath)
            fs.unlinkSync(outputPath)
            
            // Return audio data as object with raw samples and sampling rate
            resolve({
              raw: samples,
              sampling_rate: 16000
            })
          } catch (error) {
            // Clean up on error
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
            reject(error)
          }
        })
        .on('error', (error) => {
          // Clean up on error
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
          reject(new Error(`FFmpeg error: ${error.message}`))
        })
        .run()
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
      reject(error)
    }
  })
}

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    // Get the transcriber (loads model on first use)
    const model = await getTranscriber()

    // Convert audio buffer to raw format
    const audioData = await convertAudioToRaw(req.file.buffer, req.file.mimetype)

    // Check if audio has content (not all zeros/silence)
    const hasAudio = audioData.raw.some(sample => Math.abs(sample) > 0.001)
    
    if (!hasAudio) {
      return res.status(400).json({ 
        error: 'Audio appears to be silent or empty',
        details: 'Please ensure your microphone is working and you are speaking'
      })
    }
    
    // Transcribe audio - try different formats for compatibility
    let result
    let lastError = null
    
    // Try 1: Object format with minimal options
    try {
      result = await model(audioData, {
        return_timestamps: false,
      })
    } catch (err) {
      lastError = err
      // Try 2: Float32Array directly
      try {
        result = await model(audioData.raw, {
          return_timestamps: false,
        })
      } catch (err2) {
        lastError = err2
        // Try 3: Float32Array with explicit sampling_rate
        result = await model(audioData.raw, {
          return_timestamps: false,
          sampling_rate: 16000,
        })
      }
    }
    
    // If all failed, throw the last error
    if (!result && lastError) {
      throw lastError
    }
    
    // Extract text from result
    const transcriptText = result?.text || result?.[0]?.text || ''
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Transcription returned empty result',
        details: 'The audio was processed but no text was generated'
      })
    }
    
    res.json({ transcript: transcriptText })
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router