// Exact category names for display (backend stores single-word tokens: IDEA, TASK, etc.)
export const THOUGHT_TYPE_DISPLAY_NAMES = {
  IDEA: 'Ideas',
  OBSERVATION: 'Observations',
  TASK: 'Tasks & Intentions',
  QUESTION: 'Questions',
  REFERENCE: 'References',
  REFLECTION: 'Feelings & Reflections',
  EMOTION: 'Feelings & Reflections',
  INSIGHT: 'Insights',
  PLAN: 'Plans',
}

export function getThoughtTypeLabel(thought) {
  const raw = (thought.thought_type || thought.thoughtType || '').trim() || null
  if (!raw) return null
  return (
    THOUGHT_TYPE_DISPLAY_NAMES[raw.toUpperCase()] ??
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  )
}

export function getMentionList(thought) {
  if (Array.isArray(thought.mentions)) return thought.mentions
  if (typeof thought.mentions === 'string') return thought.mentions ? [thought.mentions] : []
  return []
}
