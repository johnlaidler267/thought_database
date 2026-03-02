import { GroqProvider } from '../providers/GroqProvider.js'

/**
 * Tagging Service
 * Extracts category tags from text using Llama models via Groq.
 * Uses a shared tag vocabulary: prefers reusing existing tags and only suggests new ones when necessary.
 */
export class TaggingService {
  constructor(config = {}) {
    this.provider = new GroqProvider({
      apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
      timeout: config.timeout || 10000, // 10 seconds for fast tagging
    })
    // Note: Update to 'llama-4-scout' when available, using current available model
    this.model = config.model || 'llama-3.3-70b-versatile'
    this.basePrompt = `Role
You are a semantic tagging engine.

Task
Given a piece of text, do three things:
1. Assign 2–4 tags (see tag rules below).
2. Extract the full names of any people mentioned in the text (real people the author is referring to).
3. Classify the thought into exactly ONE type: IDEA, TASK, INSIGHT, OBSERVATION, EMOTION, QUESTION.

Thought type definitions:
- IDEA – A new concept, possibility, improvement, or creative construct (future-oriented, "what if" thinking).
- TASK – An actionable item, reminder, follow-up, or commitment requiring execution.
- INSIGHT – A realization, lesson, interpretation, or clarified understanding.
- OBSERVATION – A neutral noticing of facts, patterns, behaviors, or external details.
- EMOTION – A description of an internal feeling or emotional state.
- QUESTION – An explicit uncertainty, curiosity, or unresolved problem.

Tag rules
Assign 2–4 tags from the provided existing tag list where possible. Only suggest a new tag if nothing in the existing list adequately fits. Prefer broad reusable concepts over hyper-specific ones (e.g. prefer "basketball" over "Lakers game on Tuesday"). Tags must be conceptual, not descriptive. Keep tags lowercase. Do not include proper nouns as tags.

{{EXISTING_TAGS_BLOCK}}

Rules for names
List only people who are explicitly mentioned by name in the text. Use the form the text uses. If no people are mentioned, output nothing after NAMES:.

Output format (use exactly this structure)
Line 1: A JSON array of 2–4 tag strings only. No preamble, no explanation. Example: ["relationships", "self-doubt", "work"]
Line 2: NAMES: Name1, Name2
Line 3: TYPE: IDEA

TYPE must be exactly one word: IDEA, OBSERVATION, TASK, QUESTION, REFERENCE, REFLECTION, or PLAN.

Input
{{TEXT}}

Output`
  }

  /** Valid thought types returned by the model */
  static THOUGHT_TYPES = ['IDEA', 'OBSERVATION', 'TASK', 'QUESTION', 'REFERENCE', 'REFLECTION', 'PLAN']

  /**
   * Build the existing-tags block for the prompt.
   * @param {string[]} existingTagVocabulary - Unique confirmed tags from the user's thoughts
   * @returns {string}
   */
  buildExistingTagsBlock(existingTagVocabulary) {
    const list = Array.isArray(existingTagVocabulary) ? existingTagVocabulary : []
    if (list.length === 0) {
      return 'Existing tag vocabulary: (none yet). Suggest 2–4 new broad, reusable tags.'
    }
    const formatted = list.slice(0, 500).join(', ') // cap to avoid token overflow
    return `Existing tag vocabulary (use these when they fit; only add new tags when necessary):\n${formatted}`
  }

  /**
   * Extract tags, mentions, and thought type from text.
   * Tags are suggested from a shared vocabulary when provided.
   * @param {string} text - Text to analyze
   * @param {string[]} [existingTagVocabulary] - User's confirmed tags from all thoughts (reused when possible)
   * @returns {Promise<{ tags: string[], mentions: string[], thought_type: string|null }>}
   */
  async extractTags(text, existingTagVocabulary = []) {
    if (!text || !text.trim()) {
      return { tags: [], mentions: [], thought_type: null }
    }

    try {
      const existingTagsBlock = this.buildExistingTagsBlock(existingTagVocabulary)
      const fullPrompt = this.basePrompt
        .replace('{{EXISTING_TAGS_BLOCK}}', existingTagsBlock)
        .replace('{{TEXT}}', text.trim())

      const response = await this.provider.complete(fullPrompt, this.model, {
        max_tokens: 256,
        temperature: 0.3,
      })

      // Parse line 1: JSON array of tags (e.g. ["tag1", "tag2"] or ["relationships", "self-doubt", "work"])
      let tags = []
      const firstLine = response.split('\n')[0].trim()
      const jsonMatch = firstLine.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            tags = parsed
              .filter((t) => typeof t === 'string' && t.trim())
              .map((t) => String(t).trim().toLowerCase())
            tags = [...new Set(tags)].slice(0, 5)
          }
        } catch {
          // fallback: treat as comma-separated or split on ", "
          const fallback = firstLine.replace(/^\[|\]$/g, '').split(/,\s*/).map((s) => s.replace(/^"|"$/g, '').trim().toLowerCase()).filter(Boolean)
          tags = [...new Set(fallback)].slice(0, 5)
        }
      }

      // Parse NAMES: ...
      let mentions = []
      const namesMatch = response.match(/(?:NAMES?|People|Mentioned):[ \t]*([^\n]+)/i)
      if (namesMatch && namesMatch[1]) {
        const raw = namesMatch[1].trim()
        if (raw && !/^(none|n\/a|no one|nothing)$/i.test(raw)) {
          mentions = raw.split(/[,;]/).map((n) => n.trim()).filter(Boolean)
          mentions = [...new Set(mentions)]
        }
      }

      // Parse TYPE: ...
      let thought_type = null
      const typeMatch = response.match(/TYPE:\s*(\w+)/i)
      if (typeMatch && typeMatch[1]) {
        const v = typeMatch[1].toUpperCase()
        if (TaggingService.THOUGHT_TYPES.includes(v)) thought_type = v
      }

      return {
        tags: Array.isArray(tags) ? tags : [],
        mentions: Array.isArray(mentions) ? mentions : [],
        thought_type,
      }
    } catch (error) {
      console.error('Tag extraction error:', error)
      return { tags: [], mentions: [], thought_type: null }
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
