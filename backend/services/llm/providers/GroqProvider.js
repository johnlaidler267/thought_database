import { BaseProvider } from '../base/BaseProvider.js'
import { FormData, File } from 'formdata-node'

/**
 * Groq API Provider
 * Supports: Whisper Large v3 (transcription), Llama models (tagging)
 */
export class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.baseUrl = 'https://api.groq.com/openai/v1'
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

    // Use formdata-node which is spec-compliant and works with fetch
    const formData = new FormData()
    
    // Create a File from the buffer (formdata-node supports this)
    const audioFile = new File([audioBuffer], 'audio.webm', {
      type: mimeType,
    })
    
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
      console.error('Groq transcription error:', errorMessage)
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
