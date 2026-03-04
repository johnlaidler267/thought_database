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

Rules for key points
For each person in NAMES, extract key points about them from the thought. Ask: does this information help inform the user's relationship with the person? Include each distinct piece of relevant information as a separate key point. You may extract 1–3 key points per person when the thought contains multiple relevant details. If the thought says nothing meaningful about them beyond the mention, use null.

Output format (use exactly this structure)
Line 1: A JSON array of 2–4 tag strings only. No preamble, no explanation. Example: ["relationships", "self-doubt", "work"]
Line 2: NAMES: Name1, Name2
Line 3: KEYPOINTS: Name1: point1; point2 | Name2: null
Line 4: TYPE: IDEA

KEYPOINTS format: Name: point1; point2 (semicolon-separated for multiple) or Name: null. Separate person entries with |. Use the exact name from NAMES.
TYPE must be exactly one word: IDEA, OBSERVATION, TASK, QUESTION, REFERENCE, REFLECTION, or PLAN.

Input
{{TEXT}}

Output`
  }

  /** Valid thought types returned by the model */
  static THOUGHT_TYPES = ['IDEA', 'OBSERVATION', 'TASK', 'QUESTION', 'REFERENCE', 'REFLECTION', 'PLAN', 'INSIGHT', 'EMOTION']

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

      // Parse KEYPOINTS: Name1: point1; point2 | Name2: null (semicolon = multiple per person)
      const key_points = {}
      const keypointsMatch = response.match(/(?:KEYPOINTS?):[ \t]*([^\n]+)/i)
      if (keypointsMatch && keypointsMatch[1] && mentions.length > 0) {
        const raw = keypointsMatch[1].trim()
        const entries = raw.split(/\|/).map((e) => e.trim()).filter(Boolean)
        for (const entry of entries) {
          const colonIdx = entry.indexOf(':')
          if (colonIdx > 0) {
            const name = entry.slice(0, colonIdx).trim()
            const val = entry.slice(colonIdx + 1).trim()
            if (name && (val === 'null' || val === '')) {
              key_points[name] = null
            } else if (name && val) {
              const points = val.split(';').map((p) => p.trim()).filter(Boolean)
              key_points[name] = points.length > 0 ? points : null
            }
          }
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
        key_points: typeof key_points === 'object' ? key_points : {},
        thought_type,
      }
    } catch (error) {
      console.error('Tag extraction error:', error)
      return { tags: [], mentions: [], thought_type: null }
    }
  }

  /**
   * Extract key points about a specific person from thought text.
   * Bar: does this information help inform the user's relationship with the person?
   * May return multiple key points when the thought contains several relevant details.
   * @param {string} thoughtText - The thought content
   * @param {string} personName - The person's display name
   * @returns {Promise<string[]>}
   */
  async extractKeyPointsForPerson(thoughtText, personName) {
    if (!thoughtText?.trim() || !personName?.trim()) return []
    try {
      const prompt = `From this thought, extract key points about "${personName}". For each piece of information, ask: does this help inform the user's relationship with this person? Include 1–3 key points when the thought contains multiple relevant details. Each key point: one short phrase or sentence. If the thought says nothing meaningful about them beyond the mention, output exactly: null

Thought:
${thoughtText.trim()}

Output (one key point per line, or null):`
      const response = await this.provider.complete(prompt, this.model, {
        max_tokens: 150,
        temperature: 0.2,
      })
      const trimmed = (response || '').trim()
      if (!trimmed || /^null$/i.test(trimmed)) return []
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
      return lines.filter((l) => !/^null$/i.test(l))
    } catch (err) {
      console.error('extractKeyPointsForPerson error:', err)
      return []
    }
  }

  /**
   * Generate a 2–3 sentence blurb summarizing who a person is based on their key points.
   * @param {string} displayName - Person's display name
   * @param {string[]} keyPoints - Array of extracted key points
   * @returns {Promise<string|null>}
   */
  async generateBlurb(displayName, keyPoints) {
    if (!displayName || !Array.isArray(keyPoints) || keyPoints.length === 0) {
      return null
    }
    const filtered = keyPoints.filter((k) => k && String(k).trim())
    if (filtered.length === 0) return null

    try {
      const prompt = `Given these impressions about "${displayName}" from your own notes:
${filtered.map((k) => `- ${k}`).join('\n')}

Write 2–3 sentences capturing who this person is to you — their personality, how they make you feel, and what you tend to talk about. Write as if describing them to a close friend who's never met them. Output only the summary, no preamble. Refer to the user as "you".`
      const response = await this.provider.complete(prompt, this.model, {
        max_tokens: 150,
        temperature: 0.4,
      })
      const trimmed = (response || '').trim()
      return trimmed || null
    } catch (err) {
      console.error('Blurb generation error:', err)
      return null
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
