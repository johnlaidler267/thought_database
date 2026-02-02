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
    this.prompt = `Role
You are a semantic tagging engine.

Task
Given a piece of text, extract a small set of high-level conceptual tags that describe the core ideas of the text.

Rules

Tags must be conceptual, not descriptive (ideas, domains, or lenses — not summaries).

Tags must be single words, lowercase, no spaces.

Prefer abstract categories over surface topics.

Do not invent niche or overly specific tags unless unavoidable.

Do not include proper nouns.

Do not include emotional tone unless it is central to the idea.

Tags should be stable across similar inputs.

Tag Count

Output 3–5 tags.

Output Format

Output tags only.

Each tag must be prefixed with #.

One space between tags.

No explanations, no extra text.

Interpretation Guidance

If the text is about how humans experience or interpret reality → consider perception, consciousness, or identity.

If the text is about internal mental states or practices → consider mindfulness, psychology, or suffering.

If the text is about meaning-making, structure, or models → consider frameworks, creativity, or understanding.

If the text is about physical law or universal constraints → consider physics, entropy, or reality.

Input
{{TEXT}}

Output
(tags only)`
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
      const fullPrompt = this.prompt.replace('{{TEXT}}', text.trim())
      const response = await this.provider.complete(fullPrompt, this.model, {
        max_tokens: 128,
        temperature: 0.3,
      })

      // Parse #tag format: output is tags only, each prefixed with #, space-separated
      let tags = []
      const hashTagMatches = response.match(/#(\w+)/g)
      if (hashTagMatches) {
        tags = [...new Set(hashTagMatches.map(m => m.slice(1).toLowerCase()))]
        // Cap at 5 tags (prompt asks for 3–5)
        tags = tags.slice(0, 5)
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
