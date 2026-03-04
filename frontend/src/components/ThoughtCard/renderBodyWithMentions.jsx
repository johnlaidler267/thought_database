import { getMentionList } from './constants'

/**
 * Renders text with mention names wrapped in clickable mention-highlight spans.
 * Longest names first to avoid partial matches.
 * @param {Function} [onMentionClick] - Optional. Called with (name, thoughtId) when a mention is clicked.
 */
export function renderBodyWithUnderlines(text, thought, onMentionClick) {
  const mentionList = getMentionList(thought)
  if (!text || mentionList.length === 0) return text
  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sorted = [...mentionList].sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))
  const pattern = new RegExp('\\b(' + sorted.map(escapeRegex).join('|') + ')\\b', 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (i % 2 === 0) return part
    const name = sorted.find((n) => n && part.toLowerCase() === n.toLowerCase())
    return onMentionClick && thought?.id ? (
      <button
        key={`${i}-${part}`}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onMentionClick(name || part, thought.id)
        }}
        className="mention-highlight border-0 bg-transparent p-0 font-inherit text-inherit cursor-pointer hover:underline"
        style={{ cursor: 'pointer' }}
      >
        {part}
      </button>
    ) : (
      <span key={`${i}-${part}`} className="mention-highlight" style={{ cursor: 'default' }}>
        {part}
      </span>
    )
  })
}
