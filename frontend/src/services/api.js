import { supabase } from './supabase'

// Construct API URL - ensure it ends with /api
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  
  // On mobile/production, if no API URL is set, we can't fallback to localhost
  // This will cause a clear error instead of silently failing
  if (!import.meta.env.VITE_API_URL && typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocalhost) {
      console.error('VITE_API_URL is not set. API calls will fail on mobile/production.')
    }
  }
  
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Add /api if not already present
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}
const API_URL = getApiUrl()

/** Get auth headers for API requests. Returns { Authorization: 'Bearer <token>' } or {}. Exported for use by SettingsPage, AuthContext, etc. */
export async function getAuthHeaders() {
  if (!supabase) return {}
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

/**
 * Warm the connection to the backend (and wake serverless/cold starts).
 * Call when the user lands on Home so the first transcribe request isn't slowed by connection setup or cold start.
 * Especially helps on mobile where the first request can be much slower.
 */
export function warmApiConnection() {
  fetch(`${API_URL}/health`, { method: 'GET', keepalive: true }).catch(() => {})
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  // Timeout for transcription (5 minutes for long recordings)
  const TRANSCRIPTION_TIMEOUT_MS = 5 * 60 * 1000

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS)

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Transcription failed`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (!data.transcript) {
        throw new Error('No transcript returned from server')
      }
      return data
    } catch (err) {
      clearTimeout(timeoutId)
      
      // Handle timeout
      if (err.name === 'AbortError') {
        throw new Error('Transcription timed out. Please try recording a shorter segment.')
      }
      throw err
    }
  } catch (err) {
    // Re-throw if it's already an Error with a message
    if (err instanceof Error && err.message) {
      throw err
    }
    // Handle network errors with mobile-friendly messages
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      
      if (isLocalhost) {
        throw new Error('Failed to connect to backend. Please ensure the server is running on ' + API_URL)
      } else {
        throw new Error('Failed to connect to server. Please check your internet connection and try again.')
      }
    }
    throw new Error('Failed to transcribe audio: ' + (err.message || 'Unknown error'))
  }
}

export async function cleanTranscript(rawTranscript) {
  // Timeout for LLM cleanup (30 seconds)
  const CLEANUP_TIMEOUT_MS = 30000

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CLEANUP_TIMEOUT_MS)

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch(`${API_URL}/clean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ transcript: rawTranscript }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.warn('Cleanup failed, using original transcript:', errorData.error)
        return rawTranscript
      }

      const data = await response.json()
      
      // Log errors if they occurred
      if (data.error) {
        console.error('Backend cleaning error:', data.error)
      }
      
      return data.cleaned_text || rawTranscript
    } catch (err) {
      clearTimeout(timeoutId)
      
      // Handle timeout gracefully - return original transcript
      if (err.name === 'AbortError') {
        return rawTranscript
      }
      throw err
    }
  } catch (err) {
    // On any error, return original transcript instead of failing
    // This ensures graceful degradation
    if (err.message) {
      console.warn('Cleanup error, using original transcript:', err.message)
    }
    return rawTranscript
  }
}

/**
 * Get suggested tags (and mentions, thought_type) for text using the user's existing tag vocabulary.
 * Tags are suggestions only; pass confirmed tags from all thoughts as existingTagVocabulary so the model reuses them.
 * @param {string} cleanedText - Text to analyze
 * @param {string[]} [existingTagVocabulary] - User's confirmed tags from all thoughts (reused when possible)
 */
export async function extractTags(cleanedText, existingTagVocabulary = []) {
  try {
    const vocabulary = Array.isArray(existingTagVocabulary) ? existingTagVocabulary : []
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ text: cleanedText, existingTagVocabulary: vocabulary }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Tag extraction failed')
    }

    const data = await response.json()
    return {
      tags: Array.isArray(data.tags) ? data.tags : [],
      mentions: Array.isArray(data.mentions) ? data.mentions : [],
      key_points: typeof data.key_points === 'object' ? data.key_points : {},
      thought_type: data.thought_type ?? null,
    }
  } catch (err) {
    if (err.message) {
      throw err
    }
    throw new Error('Failed to connect to tag extraction service.')
  }
}

/**
 * Trigger async blurb sync for people mentioned in a thought.
 * Fire-and-forget; does not block. Backend appends key points and regenerates blurbs.
 * @param {string} thoughtId - Thought ID
 * @param {string} userId - User ID
 * @param {Record<string, string|null>} mentionKeyPoints - Map of display name to key point (or null)
 */
/**
 * Regenerate blurb for an existing person from their linked thoughts.
 * @param {string} personId - Person ID
 * @param {string} userId - User ID
 * @returns {Promise<{ blurb: string|null }>}
 */
export async function regenerateBlurbForPerson(personId, userId) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_URL}/people/regenerate-blurb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ personId, userId }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return { blurb: data.blurb ?? null }
}

export function syncBlurbForThought(thoughtId, userId, mentionKeyPoints) {
  if (!thoughtId || !userId || !mentionKeyPoints || Object.keys(mentionKeyPoints).length === 0) return
  getAuthHeaders().then((authHeaders) =>
    fetch(`${API_URL}/people/sync-blurb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ thoughtId, userId, mentionKeyPoints }),
    })
  ).catch((err) => console.warn('syncBlurbForThought failed:', err))
}

/**
 * Get a single short reflection question from the LLM given thought text and follow-ups.
 * @param {string} thoughtText - The main thought content
 * @param {Array<string|{text: string}>} followUps - Follow-up entries (strings or objects with .text)
 * @returns {Promise<string|null>} The question text or null
 */
/**
 * Get 5 journaling prompts for a given intent (e.g. "What's on your mind?", "Tell me about your day").
 * @param {string} intent - User's selected intent label
 * @returns {Promise<string[]>} Array of 5 prompt strings
 */
export async function getThoughtStarterPrompts(intent) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_URL}/thought-starters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ intent }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return Array.isArray(data.prompts) ? data.prompts : []
}

export async function getReflectQuestion(thoughtText, followUps = []) {
  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_URL}/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        thoughtText: thoughtText || '',
        followUps: Array.isArray(followUps) ? followUps : [],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${response.status}`)
    }
    const data = await response.json()
    return data.question ?? null
  } catch (err) {
    if (err.message) throw err
    throw new Error('Failed to get reflection question.')
  }
}

/**
 * Distill thought text to a shorter version. Level 1 = light tighten, 2 = 2–3 sentences, 3 = one sentence, 4+ = phrase/title.
 * @param {string} text - Current displayed text to condense
 * @param {number} level - Distillation step (1, 2, 3, 4+)
 * @returns {Promise<string>} Distilled text
 */
export async function distillText(text, level) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_URL}/distill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ text: text || '', level: Math.max(1, parseInt(level, 10) || 1) }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return data.distilled_text ?? text ?? ''
}

/**
 * Rewrite thought text for clarity and optimal wording (not condensing).
 * @param {string} text - Current displayed text
 * @returns {Promise<string>} Rewritten text
 */
export async function rewriteText(text) {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_URL}/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ text: text || '' }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return data.rewritten_text ?? text ?? ''
}
