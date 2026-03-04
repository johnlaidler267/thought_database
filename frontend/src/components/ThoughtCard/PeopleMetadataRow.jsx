import { User, LayoutList, Folder } from 'lucide-react'
import { getThoughtTypeLabel, getMentionList } from './constants'

const separatorStyle = { backgroundColor: 'var(--stroke)' }
const iconStyle = { color: 'var(--muted-foreground)' }
const textStyle = { color: 'var(--muted-foreground)' }

export function PeopleMetadataRow({ thought, linkedPeople = [], onPersonClick, onMentionClick }) {
  const mentionList = getMentionList(thought)
  const thoughtTypeLabel = getThoughtTypeLabel(thought)
  const category = thought.category && thought.category.trim()
  const hasCategory = Boolean(category)
  const hasType = Boolean(thoughtTypeLabel)
  const hasPeople = linkedPeople.length > 0 || mentionList.length > 0

  if (!hasCategory && !hasType && !hasPeople) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4" style={{ color: 'var(--muted-foreground)' }}>
      {hasCategory && (
        <div className="flex items-center gap-1.5">
          <Folder className="w-3 h-3 text-muted-foreground shrink-0" style={iconStyle} />
          <span className="text-xs font-serif text-muted-foreground" style={textStyle}>
            {category}
          </span>
        </div>
      )}
      {hasCategory && hasType && (
        <span className="w-px h-3 bg-stroke shrink-0" style={separatorStyle} aria-hidden />
      )}
      {hasType && (
        <div className="flex items-center gap-1.5">
          <LayoutList className="w-3 h-3 text-muted-foreground shrink-0" style={iconStyle} />
          <span className="text-xs font-serif text-muted-foreground" style={textStyle}>
            {thoughtTypeLabel}
          </span>
        </div>
      )}
      {(hasType || hasCategory) && hasPeople && (
        <span className="w-px h-3 bg-stroke shrink-0" style={separatorStyle} aria-hidden />
      )}
      {hasPeople && (
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground shrink-0" style={iconStyle} />
          <div className="flex flex-wrap gap-1.5">
            {linkedPeople.length > 0
              ? linkedPeople.map((p) => (
                  <button
                    key={p.person_id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      onPersonClick?.(p.person_id)
                    }}
                    className="text-xs font-serif text-muted-foreground cursor-pointer border-b border-transparent hover:border-current hover:text-ink transition-colors"
                    style={textStyle}
                  >
                    {p.display_name}
                    {p.clarifier ? ` (${p.clarifier})` : ''}
                  </button>
                ))
              : mentionList.map((name) => (
                  <button
                    key={String(name)}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      onMentionClick?.(name, thought.id)
                    }}
                    className="text-xs font-serif text-muted-foreground cursor-pointer border-b border-transparent hover:border-current hover:text-ink transition-colors"
                    style={textStyle}
                  >
                    {name}
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  )
}
