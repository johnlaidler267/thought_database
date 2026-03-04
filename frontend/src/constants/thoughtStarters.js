/**
 * Intent options for dynamic Thought Starters.
 * User taps one → AI generates 5 prompts → user picks one.
 */
export const THOUGHT_STARTER_INTENTS = [
  "What's on your mind?",
  'Tell me about your day',
  'I want to think something through',
  'I want to go deep',
  'Just get me talking',
]

/** Cache key prefix. Full key: thought_starters_${slug} */
const CACHE_PREFIX = 'thought_starters_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function intentToSlug(intent) {
  return String(intent)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Get cached prompts for an intent, or null if expired/missing.
 * @param {string} intent
 * @returns {string[]|null}
 */
export function getCachedPrompts(intent) {
  try {
    const slug = intentToSlug(intent)
    const raw = localStorage.getItem(`${CACHE_PREFIX}${slug}`)
    if (!raw) return null
    const { prompts, expiresAt } = JSON.parse(raw)
    if (!Array.isArray(prompts) || prompts.length === 0) return null
    if (Date.now() > expiresAt) return null
    return prompts
  } catch {
    return null
  }
}

/**
 * Store prompts in cache for an intent.
 * @param {string} intent
 * @param {string[]} prompts
 */
export function setCachedPrompts(intent, prompts) {
  try {
    const slug = intentToSlug(intent)
    const expiresAt = Date.now() + CACHE_TTL_MS
    localStorage.setItem(
      `${CACHE_PREFIX}${slug}`,
      JSON.stringify({ prompts, expiresAt })
    )
  } catch {
    // Ignore storage errors
  }
}
