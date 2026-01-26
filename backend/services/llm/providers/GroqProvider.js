import { BaseProvider } from '../base/BaseProvider.js'
import { FormData, File } from 'formdata-node'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

/**
 * Groq API Provider
 * Supports: Whisper Large v3 (transcription), Llama models (tagging)
 */
export class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.baseUrl = 'https://api.groq.com/openai/v1'
    // Set ffmpeg path if using ffmpeg-static
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic)
    }
  }

  /**
   * Convert WebM to WAV format
   * @param {Buffer} webmBuffer - WebM audio buffer
   * @returns {Promise<Buffer>} - WAV audio buffer
   */
  async convertWebMToWAV(webmBuffer) {
    const inputPath = join(tmpdir(), `input-${randomUUID()}.webm`)
    const outputPath = join(tmpdir(), `output-${randomUUID()}.wav`)

    try {
      // Write WebM to temp file
      writeFileSync(inputPath, webmBuffer)

      // Convert to WAV using ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('wav')
          .audioCodec('pcm_s16le') // 16-bit PCM for WAV
          .audioFrequency(16000) // 16kHz sample rate (Whisper's preferred)
          .audioChannels(1) // Mono
          .on('error', (err) => {
            console.error('[GROQ] FFmpeg conversion error:', err.message)
            reject(err)
          })
          .on('end', () => {
            resolve()
          })
          .save(outputPath)
      })

      // Read WAV file
      const wavBuffer = readFileSync(outputPath)
      return wavBuffer
    } finally {
      // Clean up temp files
      try {
        unlinkSync(inputPath)
      } catch (e) {
        // Ignore cleanup errors
      }
      try {
        unlinkSync(outputPath)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Transcribe audio using Whisper Large v3
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} mimeType - MIME type of audio
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribe(audioBuffer, mimeType = 'audio/webm') {
    this.validateApiKey()

    // Ensure audioBuffer is a proper Node.js Buffer
    if (!Buffer.isBuffer(audioBuffer)) {
      if (audioBuffer instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(audioBuffer)
      } else if (audioBuffer instanceof Uint8Array) {
        audioBuffer = Buffer.from(audioBuffer)
      } else {
        throw new Error('Invalid audio buffer format')
      }
    }

    // Validate buffer is not empty
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty')
    }

    // Convert WebM to WAV if needed (Groq Whisper works better with WAV)
    let finalBuffer = audioBuffer
    let finalMimeType = mimeType
    let finalFilename = 'audio.webm'

    if (mimeType.includes('webm')) {
      try {
        finalBuffer = await this.convertWebMToWAV(audioBuffer)
        finalMimeType = 'audio/wav'
        finalFilename = 'audio.wav'
        
        // Validate converted buffer
        if (!finalBuffer || finalBuffer.length === 0) {
          throw new Error('Conversion produced empty buffer')
        }
        if (finalBuffer.length < 1000) {
          console.warn(`[GROQ] Warning: Converted WAV is very small (${finalBuffer.length} bytes)`)
        }
      } catch (error) {
        console.warn(`[GROQ] WebM to WAV conversion failed, using original WebM:`, error.message)
        // Continue with original WebM if conversion fails
      }
    }

    // Final validation before sending
    if (!finalBuffer || finalBuffer.length === 0) {
      throw new Error('Audio buffer is empty after processing')
    }
    if (finalBuffer.length < 1000) {
      console.warn(`[GROQ] Warning: Audio buffer is very small (${finalBuffer.length} bytes) - may be too short for transcription`)
    }
    
    // Use formdata-node which is spec-compliant and works with fetch
    const formData = new FormData()
    
    // Create a File from the buffer (formdata-node supports this)
    // CRITICAL: Use 'file' as the field name (Groq/OpenAI Whisper API requirement)
    const audioFile = new File([finalBuffer], finalFilename, {
      type: finalMimeType,
    })
    
    // Validate File object was created correctly
    if (!audioFile || audioFile.size === 0) {
      throw new Error('Failed to create valid File object from audio buffer')
    }
    
    // Verify the buffer inside the File is actually readable
    if (finalMimeType === 'audio/wav') {
      // WAV files should start with "RIFF" header
      const wavHeader = finalBuffer.slice(0, 4).toString('ascii')
      if (wavHeader !== 'RIFF') {
        console.warn(`[GROQ] Warning: WAV file doesn't start with RIFF header (got: ${wavHeader})`)
      }
    }
    
    // CRITICAL: Field name must be 'file' (not 'audio', 'data', etc.)
    formData.append('file', audioFile)
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'en')

    // Don't manually set Content-Type - let fetch set it with boundary
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
    }

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers,
        body: formData,
      })
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const errorMessage = error.error?.message || error.error || response.statusText
      console.error('[GROQ] Transcription error:', errorMessage)
      throw new Error(`Groq API error: ${errorMessage}`)
    }

    const data = await response.json()
    return data.text || ''
  }

  /**
   * Generate text completion using Llama models
   * @param {string} prompt - The prompt
   * @param {string} model - Model name (e.g., 'llama-3.3-70b-versatile')
   * @param {object} options - Additional options (max_tokens, temperature, etc.)
   * @returns {Promise<string>} - Generated text
   */
  async complete(prompt, model = 'llama-3.3-70b-versatile', options = {}) {
    this.validateApiKey()

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: options.max_tokens || 1024,
          temperature: options.temperature || 0.7,
          ...options,
        }),
      })
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Groq API error: ${error.error?.message || error.error || response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }
}
