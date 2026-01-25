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
      console.log('🎤 Starting transcription, audio size:', audioBuffer.length, 'bytes, mimeType:', mimeType)
      const result = await this.provider.transcribe(audioBuffer, mimeType)
      console.log('✅ Transcription successful, result length:', result?.length || 0)
      console.log('📝 Transcript preview:', result?.substring(0, 100) + (result?.length > 100 ? '...' : ''))
      return result
    } catch (error) {
      console.error('❌ Transcription error:', error.message || error)
      console.error('Error details:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isConfigured() {
    const hasKey = !!this.provider.apiKey
    console.log('🔍 TranscriptionService.isConfigured() check:')
    console.log('  - Provider API key exists?', hasKey)
    console.log('  - Provider API key length:', this.provider.apiKey?.length || 0)
    console.log('  - Config groqApiKey exists?', !!this.provider.apiKey)
    console.log('  - Process.env.GROQ_API_KEY exists?', !!process.env.GROQ_API_KEY)
    console.log('  - Process.env.GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0)
    return hasKey
  }
}
