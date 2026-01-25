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
    console.log('🌐 Calling Google AI API:', url.substring(0, 80) + '...')
    console.log('📝 Prompt length:', prompt.length)
    console.log('🔑 API Key present?', !!this.apiKey, 'Length:', this.apiKey?.length || 0)
    console.log('⚙️ Model:', model)
    console.log('⚙️ Options:', { max_tokens: options.max_tokens, temperature: options.temperature })

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

    console.log('📡 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('❌ Google AI API error response:', error)
      throw new Error(`Google AI API error: ${error.error?.message || error.error || response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Google AI API success, response structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
      hasContent: !!data.candidates?.[0]?.content,
      hasParts: !!data.candidates?.[0]?.content?.parts,
      partsLength: data.candidates?.[0]?.content?.parts?.length || 0
    })
    
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('📄 Extracted text length:', result.length)
    console.log('📄 Extracted text preview:', result.substring(0, 100) + (result.length > 100 ? '...' : ''))
    
    return result
  }
}
