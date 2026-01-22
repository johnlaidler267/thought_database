import { BaseProvider } from '../base/BaseProvider.js'
import FormData from 'form-data'

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

    const formData = new FormData()
    
    // Append file buffer with proper options for form-data
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: mimeType,
    })
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'en') // Optional: auto-detect if not specified

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders(), // Get proper Content-Type with boundary
        },
        body: formData,
      })
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Groq API error: ${error.error?.message || error.error || response.statusText}`)
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
