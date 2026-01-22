import { GroqProvider } from '../providers/GroqProvider.js'

/**
 * Tagging Service
 * Extracts category tags from text using Llama models via Groq
 */
export class TaggingService {
  constructor(config = {}) {
    this.provider = new GroqProvider({
      apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
      timeout: config.timeout || 10000, // 10 seconds for fast tagging
    })
    // Note: Update to 'llama-4-scout' when available, using current available model
    this.model = config.model || 'llama-3.3-70b-versatile'
    this.prompt = `Extract simple category tags from the following text. 

Return ONLY a JSON array of tag strings. Use these categories:
- #Idea (for ideas, concepts, thoughts)
- #Person (for people, names, relationships)
- #Task (for tasks, todos, reminders)
- #Note (for general notes)

Only include tags that are clearly present. Return an empty array if none apply.

Example format: ["Idea", "Task"]

Text to analyze:`
  }

  /**
   * Extract tags from text
   * @param {string} text - Text to analyze
   * @returns {Promise<string[]>} - Array of tag strings
   */
  async extractTags(text) {
    if (!text || !text.trim()) {
      return []
    }

    try {
      const fullPrompt = `${this.prompt}\n\n${text}`
      const response = await this.provider.complete(fullPrompt, this.model, {
        max_tokens: 256,
        temperature: 0.5,
      })

      // Try to parse JSON from response
      let tags = []
      try {
        // Extract JSON array from response (handle cases where there's extra text)
        const jsonMatch = response.match(/\[.*?\]/s)
        if (jsonMatch) {
          tags = JSON.parse(jsonMatch[0])
          // Validate tags are strings and in allowed categories
          const allowedTags = ['Idea', 'Person', 'Task', 'Note']
          tags = tags.filter(tag => 
            typeof tag === 'string' && allowedTags.includes(tag)
          )
        }
      } catch (parseError) {
        console.error('Failed to parse tags:', parseError)
        // Return empty array if parsing fails
      }

      return Array.isArray(tags) ? tags : []
    } catch (error) {
      console.error('Tag extraction error:', error)
      // Return empty array on failure - graceful degradation
      return []
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
