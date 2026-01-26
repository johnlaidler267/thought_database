import { GroqProvider } from '../providers/GroqProvider.js'

/**
 * Transcription Service
 * Handles audio transcription using Whisper Large v3 via Groq
 */
export class TranscriptionService {
  constructor(config = {}) {
    this.provider = new GroqProvider({
      apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
      timeout: config.timeout || 300000, // 5 minutes for transcription
    })
    this.model = config.model || 'whisper-large-v3'
  }

  /**
   * Transcribe audio buffer to text
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} mimeType - MIME type of audio
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribe(audioBuffer, mimeType = 'audio/webm') {
    try {
      const result = await this.provider.transcribe(audioBuffer, mimeType)
      return result
    } catch (error) {
      console.error('❌ Transcription error:', error.message || error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.provider.apiKey
  }
}
