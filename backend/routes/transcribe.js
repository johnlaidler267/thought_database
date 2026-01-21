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
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine)
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress.percent + '%')
        })
        .on('end', () => {
          console.log('FFmpeg conversion completed')
          try {
            // Read the raw audio data
            const rawAudioData = fs.readFileSync(outputPath)
            
            console.log(`FFmpeg output file size: ${rawAudioData.length} bytes`)
            
            if (rawAudioData.length === 0) {
              throw new Error('FFmpeg produced empty audio file')
            }
            
            if (rawAudioData.length < 100) {
              console.warn(`Warning: FFmpeg output is very small (${rawAudioData.length} bytes)`)
            }
            
            // Convert to Float32Array (normalized to -1.0 to 1.0)
            // Use Buffer's readInt16LE method for proper little-endian conversion
            const sampleCount = rawAudioData.length / 2
            const samples = new Float32Array(sampleCount)
            
            // Read 16-bit little-endian signed integers and normalize
            for (let i = 0; i < sampleCount; i++) {
              const int16Value = rawAudioData.readInt16LE(i * 2)
              // Normalize to -1.0 to 1.0
              samples[i] = int16Value / 32768.0
            }
            
            // Check a sample of the converted audio
            const sampleMax = Math.max(...Array.from(samples.slice(0, Math.min(1000, samples.length)).map(s => Math.abs(s))))
            console.log(`Converted audio: ${samples.length} samples, sample max amplitude: ${sampleMax.toFixed(6)}`)
            
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

    console.log(`Received audio: ${req.file.buffer.length} bytes, type: ${req.file.mimetype}`)

    // Get the transcriber (loads model on first use)
    const model = await getTranscriber()

    // Convert audio buffer to raw format
    const audioData = await convertAudioToRaw(req.file.buffer, req.file.mimetype)
    
    if (!audioData || !audioData.raw || audioData.raw.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to process audio file',
        details: 'Audio conversion produced no data'
      })
    }

    // Log audio info for debugging
    console.log(`Audio samples: ${audioData.raw.length}, Sample rate: ${audioData.sampling_rate}`)
    
    // Check if audio has any significant content (very lenient check)
    // We'll let Whisper handle actual silence detection since it's better at it
    const sampleCount = Math.min(10000, audioData.raw.length) // Check up to 10000 samples
    const maxAmplitude = Math.max(...audioData.raw.slice(0, sampleCount).map(s => Math.abs(s)))
    const avgAmplitude = audioData.raw.slice(0, sampleCount).reduce((sum, s) => sum + Math.abs(s), 0) / sampleCount
    
    console.log(`Audio stats - Max amplitude: ${maxAmplitude.toFixed(6)}, Avg amplitude: ${avgAmplitude.toFixed(6)}`)
    
    // Only reject if audio is completely flat (all zeros or near-zero)
    // Very lenient threshold - let Whisper handle actual silence
    if (maxAmplitude < 0.00001 && avgAmplitude < 0.000001) {
      console.log(`Audio appears completely silent (max: ${maxAmplitude}, avg: ${avgAmplitude})`)
      return res.status(400).json({ 
        error: 'Audio appears to be completely silent',
        details: 'Please ensure your microphone is working and you are speaking'
      })
    }
    
    // Transcribe audio - pass Float32Array directly (this is what the model expects)
    let result
    try {
      // The model expects a Float32Array, not an object
      result = await model(audioData.raw, {
        return_timestamps: false,
        chunk_length_s: 30, // Process in 30-second chunks
      })
    } catch (err) {
      console.error('Transcription failed:', err.message)
      throw new Error(`Transcription failed: ${err.message}`)
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
    const statusCode = error.message?.includes('silent') || error.message?.includes('empty') ? 400 : 500
    res.status(statusCode).json({ 
      error: error.message || 'Failed to transcribe audio',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

export default router