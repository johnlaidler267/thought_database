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
Given a piece of text, do two things:
1. Extract a small set of high-level conceptual tags that describe the core ideas of the text.
2. Extract the full names of any people mentioned in the text (real people the author is referring to).

Rules for tags

Tags must be conceptual, not descriptive (ideas, domains, or lenses — not summaries).

Tags must be single words, lowercase, no spaces.

Prefer abstract categories over surface topics.

Do not invent niche or overly specific tags unless unavoidable.

Do not include proper nouns as tags.

Do not include emotional tone unless it is central to the idea.

Tags should be stable across similar inputs.

Output 3–5 tags.

Rules for names

List only people who are explicitly mentioned by name in the text (e.g. "Sarah", "Dr. Smith", "John and Maria").
Use the form the text uses (first name only is fine; full name if given).
Do not invent or assume names. If no people are mentioned, output nothing after NAMES:.

Output Format (use exactly this structure)

TAGS: #tag1 #tag2 #tag3
NAMES: Name1, Name2

One space between tags. Comma-separated names. No other text.

Interpretation Guidance (tags)

If the text is about how humans experience or interpret reality → consider perception, consciousness, or identity.

If the text is about internal mental states or practices → consider mindfulness, psychology, or suffering.

If the text is about meaning-making, structure, or models → consider frameworks, creativity, or understanding.

If the text is about physical law or universal constraints → consider physics, entropy, or reality.

Input
{{TEXT}}

Output`
  }

  /**
   * Extract tags and mentioned person names from text
   * @param {string} text - Text to analyze
   * @returns {Promise<{ tags: string[], mentions: string[] }>} - Tags and list of person names
   */
  async extractTags(text) {
    if (!text || !text.trim()) {
      return { tags: [], mentions: [] }
    }

    try {
      const fullPrompt = this.prompt.replace('{{TEXT}}', text.trim())
      const response = await this.provider.complete(fullPrompt, this.model, {
        max_tokens: 256,
        temperature: 0.3,
      })

      // Parse TAGS: #tag1 #tag2 ...
      let tags = []
      const hashTagMatches = response.match(/#(\w+)/g)
      if (hashTagMatches) {
        tags = [...new Set(hashTagMatches.map(m => m.slice(1).toLowerCase()))]
        tags = tags.slice(0, 5)
      }

      // Parse NAMES: Name1, Name2 ... (lenient: NAMES:, Names:, or line with comma-separated names after tags)
      let mentions = []
      const namesMatch = response.match(/(?:NAMES?|People|Mentioned):\s*([^\n]+)/i)
      if (namesMatch && namesMatch[1]) {
        const raw = namesMatch[1].trim()
        if (raw && !/^(none|n\/a|no one|nothing)$/i.test(raw)) {
          mentions = raw.split(/[,;]/).map(n => n.trim()).filter(Boolean)
          mentions = [...new Set(mentions)]
        }
      }

      return {
        tags: Array.isArray(tags) ? tags : [],
        mentions: Array.isArray(mentions) ? mentions : [],
      }
    } catch (error) {
      console.error('Tag extraction error:', error)
      return { tags: [], mentions: [] }
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
