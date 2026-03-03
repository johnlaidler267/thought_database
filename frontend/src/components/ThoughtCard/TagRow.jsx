import { tagButton, tagChip } from './styles'

export function TagRow({
  thought,
  suggestedTags = [],
  activeTags,
  onTagClick,
  onConfirmSuggestedTag,
}) {
  const confirmed = thought.tags && thought.tags.length > 0 ? thought.tags : []
  const confirmedSet = new Set(confirmed.map((t) => String(t).toLowerCase()))
  const suggestedToShow =
    Array.isArray(suggestedTags) && onConfirmSuggestedTag
      ? suggestedTags.filter((t) => !confirmedSet.has(String(t).toLowerCase()))
      : []
  const hasAny = confirmed.length > 0 || suggestedToShow.length > 0
  if (!hasAny) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-baseline">
      {confirmed.map((tag) => {
        const isTagActive = Boolean(
          onTagClick &&
            Array.isArray(activeTags) &&
            activeTags.some((t) => String(t).trim().toLowerCase() === tag.toLowerCase())
        )
        return onTagClick ? (
          <button
            key={tag}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onTagClick(tag)
            }}
            className="relative overflow-hidden px-2 py-1 text-xs font-serif leading-tight border border-stroke rounded text-muted-foreground cursor-pointer transition-colors hover:border-ink hover:text-ink inline-block align-baseline min-h-0"
            style={tagButton}
          >
            <span
              className="absolute inset-0 rounded transition duration-200"
              style={{
                backgroundColor: 'var(--muted)',
                filter: isTagActive ? 'brightness(0.85)' : 'none',
              }}
              aria-hidden
            />
            <span className="relative z-10">{tag}</span>
          </button>
        ) : (
          <span
            key={tag}
            className="px-2 py-1 text-xs font-serif leading-tight border border-stroke rounded bg-muted/50 text-muted-foreground"
            style={tagChip}
          >
            {tag}
          </span>
        )
      })}
      {suggestedToShow.map((tag, i) => (
        <button
          key={tag}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onConfirmSuggestedTag(thought.id, tag)
          }}
          className={`py-0.5 text-xs font-serif leading-tight rounded cursor-pointer transition-colors hover:opacity-80 tracking-wide ${i === 0 ? 'pl-0 pr-2' : 'px-2'}`}
          style={{ color: 'var(--muted-foreground)' }}
          aria-label={`Add tag ${tag}`}
        >
          + {tag}
        </button>
      ))}
    </div>
  )
}
