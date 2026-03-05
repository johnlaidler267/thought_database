import { useState, useRef } from 'react'
import { User, LayoutList, Folder } from 'lucide-react'
import { getThoughtTypeLabel, getMentionList } from './constants'
import { CategoryAssignPopover } from './CategoryAssignPopover'

const separatorStyle = { backgroundColor: 'var(--stroke)' }
const iconStyle = { color: 'var(--muted-foreground)' }
const textStyle = { color: 'var(--muted-foreground)' }

function getThoughtCategories(thought) {
  const arr = thought.categories
  if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean).map(String)
  const single = thought.category && thought.category.trim()
  return single ? [single] : []
}

/** Normalize for comparison (trim, lower). */
function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase()
}

export function PeopleMetadataRow({
  thought,
  linkedPeople = [],
  onPersonClick,
  onMentionClick,
  categories = [],
  onCategoriesChange,
  /** Set or array of display names to hide (e.g. deleted profiles) so they don't show in the persons section. */
  deletedPersonDisplayNames,
}) {
  const categoryTriggerRef = useRef(null)
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false)

  const rawMentionList = getMentionList(thought)
  const deletedSet =
    deletedPersonDisplayNames == null
      ? null
      : new Set(
          [...(deletedPersonDisplayNames instanceof Set ? deletedPersonDisplayNames : Array.isArray(deletedPersonDisplayNames) ? deletedPersonDisplayNames : [])].map(
            normalizeName
          )
        )
  const mentionList =
    deletedSet && deletedSet.size > 0
      ? rawMentionList.filter((name) => !deletedSet.has(normalizeName(name)))
      : rawMentionList
  const linkedPeopleFiltered =
    deletedSet && deletedSet.size > 0
      ? linkedPeople.filter((p) => !deletedSet.has(normalizeName(p.display_name)))
      : linkedPeople
  const thoughtTypeLabel = getThoughtTypeLabel(thought)
  const thoughtCategories = getThoughtCategories(thought)
  const hasCategoryBlock = thoughtCategories.length > 0
  const canAssignCategories = categories.length > 0 && onCategoriesChange
  const hasType = Boolean(thoughtTypeLabel)
  const hasPeople = linkedPeopleFiltered.length > 0 || mentionList.length > 0

  const showCategoryBlock = hasCategoryBlock

  const categoryDisplayLabel =
    thoughtCategories.length === 0
      ? null
      : thoughtCategories.length === 1
        ? thoughtCategories[0]
        : `${thoughtCategories[0]} +${thoughtCategories.length - 1}`

  const handleToggleCategory = (cat) => {
    const next = thoughtCategories.includes(cat)
      ? thoughtCategories.filter((c) => c !== cat)
      : [...thoughtCategories, cat]
    onCategoriesChange?.(thought.id, next)
  }

  const handleCreateAndAssign = (newName) => {
    onCategoriesChange?.(thought.id, [...thoughtCategories, newName])
    setCategoryPopoverOpen(false)
  }

  if (!showCategoryBlock && !hasType && !hasPeople) return null

  return (
    <div
      className="flex items-center gap-2 flex-wrap mb-4"
      style={{
        color: 'var(--muted-foreground)',
        position: 'relative',
      }}
    >
      {showCategoryBlock && (
        <div className="flex items-center gap-1.5" style={{ position: 'relative' }} ref={categoryTriggerRef}>
          {canAssignCategories ? (
            <button
              type="button"
              onClick={() => setCategoryPopoverOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-serif cursor-pointer border-0 bg-transparent p-0 transition-colors duration-200"
              style={textStyle}
              aria-label={`Categories: ${categoryDisplayLabel}`}
              aria-expanded={categoryPopoverOpen}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.opacity = '1'
              }}
            >
              <Folder className="w-3 h-3 shrink-0" style={{ color: 'inherit' }} />
              <span style={{ color: 'inherit' }}>{categoryDisplayLabel}</span>
            </button>
          ) : (
            <>
              <Folder className="w-3 h-3 text-muted-foreground shrink-0" style={iconStyle} />
              <span className="text-xs font-serif text-muted-foreground" style={textStyle}>
                {categoryDisplayLabel}
              </span>
            </>
          )}

          {categoryPopoverOpen && canAssignCategories && (
            <CategoryAssignPopover
              anchorRef={categoryTriggerRef}
              categories={categories}
              assignedCategories={thoughtCategories}
              onToggle={handleToggleCategory}
              onCreateAndAssign={handleCreateAndAssign}
              onClose={() => setCategoryPopoverOpen(false)}
            />
          )}
        </div>
      )}

      {showCategoryBlock && hasType && (
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

      {(hasType || showCategoryBlock) && hasPeople && (
        <span className="w-px h-3 bg-stroke shrink-0" style={separatorStyle} aria-hidden />
      )}

      {hasPeople && (
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-muted-foreground shrink-0" style={iconStyle} />
          <div className="flex flex-wrap gap-1">
            {linkedPeopleFiltered.length > 0
              ? linkedPeopleFiltered.map((p) => (
                  <button
                    key={p.person_id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      onPersonClick?.(p.person_id)
                    }}
                    className="text-xs font-serif cursor-pointer transition-colors duration-200 bg-transparent p-0 border-0"
                    style={textStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--ink)'
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                      e.currentTarget.style.opacity = '1'
                    }}
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
                    className="text-xs font-serif cursor-pointer transition-colors duration-200 bg-transparent p-0 border-0"
                    style={textStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--ink)'
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                      e.currentTarget.style.opacity = '1'
                    }}
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
