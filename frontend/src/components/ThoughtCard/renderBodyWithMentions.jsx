import { getMentionList } from './constants'

/**
 * Renders text with mention names wrapped in mention-highlight spans.
 * Longest names first to avoid partial matches.
 */
export function renderBodyWithUnderlines(text, thought) {
  const mentionList = getMentionList(thought)
  if (!text || mentionList.length === 0) return text
  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sorted = [...mentionList].sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))
  const pattern = new RegExp('\\b(' + sorted.map(escapeRegex).join('|') + ')\\b', 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (i % 2 === 0) return part
    return (
      <span key={`${i}-${part}`} className="mention-highlight" style={{ cursor: 'default' }}>
        {part}
      </span>
    )
  })
}
