import { GoogleAIProvider } from '../providers/GoogleAIProvider.js'

/**
 * Cleaning Service
 * Removes filler words and cleans up transcripts using Gemini 2.5 Flash-Lite
 */
export class CleaningService {
  constructor(config = {}) {
    this.provider = new GoogleAIProvider({
      apiKey: config.googleApiKey || process.env.GOOGLE_AI_API_KEY,
      timeout: config.timeout || 30000, // 30 seconds
    })
    this.model = config.model || 'gemini-2.0-flash' // Using standard production model (gemini-2.0-flash-exp is not available)
    this.prompt = `You are a text cleaning assistant. Your task is to clean up spoken transcripts by:

1. Removing filler words ("um", "uh", "like", "you know", etc.)
2. Removing stutters and repetitions
3. Fixing minor grammatical issues from speech
4. Ensuring all sentences are complete sentences with proper punctuation
5. Preserving the user's original voice and meaning
6. Keeping the text concise but NOT rewriting it

Important: Do NOT change the core meaning or rewrite the content. Only clean up the speech artifacts. Make sure all sentences are grammatically complete and properly punctuated.

Return ONLY the cleaned text, no explanations or additional commentary.`
  }

  /**
   * Clean transcript by removing filler words and fixing speech artifacts
   * @param {string} transcript - Raw transcript text
   * @returns {Promise<string>} - Cleaned transcript
   */
  async clean(transcript) {
    if (!transcript || !transcript.trim()) {
      return transcript
    }

    try {
      const fullPrompt = `${this.prompt}\n\nOriginal transcript:\n${transcript}`
      
      const cleanedText = await this.provider.complete(fullPrompt, this.model, {
        max_tokens: Math.max(transcript.length * 2, 2048), // Ensure enough tokens for long transcripts
        temperature: 0.3, // Lower temperature for more consistent cleaning
      })

      return cleanedText.trim() || transcript
    } catch (error) {
      console.error('Cleaning error:', error.message)
      if (error.message?.includes('timeout')) {
        console.warn('Cleaning timed out')
      }
      // Re-throw so the route handler can see the error
      throw error
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
