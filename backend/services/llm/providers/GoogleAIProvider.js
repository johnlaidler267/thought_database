import { BaseProvider } from '../base/BaseProvider.js'

/**
 * Google AI Studio Provider
 * Supports: Gemini models (cleaning, general text tasks)
 */
export class GoogleAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1'
  }

  /**
   * Generate text completion using Gemini models
   * @param {string} prompt - The prompt
   * @param {string} model - Model name (e.g., 'gemini-2.0-flash')
   * @param {object} options - Additional options
   * @returns {Promise<string>} - Generated text
   */
  async complete(prompt, model = 'gemini-2.0-flash', options = {}) {
    this.validateApiKey()

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: options.max_tokens || 2048,
        temperature: options.temperature || 0.7,
        ...options.generationConfig,
      },
    }

    const response = await this.withTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Google AI API error:', error.error?.message || error.error || response.statusText)
      throw new Error(`Google AI API error: ${error.error?.message || error.error || response.statusText}`)
    }

    const data = await response.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    return result
  }
}
