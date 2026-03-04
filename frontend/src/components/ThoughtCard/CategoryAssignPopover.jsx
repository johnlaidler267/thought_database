import { useState, useRef, useEffect } from 'react'
import { Check, Plus } from 'lucide-react'

const POPOVER_WRAPPER = {
  position: 'absolute',
  left: 0,
  top: '100%',
  marginTop: 4,
  zIndex: 30, // below homepage record bar (z-40) so menu stays under the speech button
}

const POPOVER_ARROW = {
  position: 'absolute',
  left: 14,
  top: -5,
  width: 0,
  height: 0,
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  borderBottom: '6px solid #fff',
  filter: 'drop-shadow(0 -1px 0 rgba(0,0,0,0.08))',
}

const POPOVER_STYLE = {
  minWidth: 220,
  maxWidth: 280,
  maxHeight: 240,
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  border: '1px solid rgba(0,0,0,0.08)',
  padding: '8px 0',
  fontFamily: 'var(--font-serif), serif',
  fontSize: 13,
}

const ROW_BASE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 12px 6px 14px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--ink)',
  textAlign: 'left',
  font: 'inherit',
  transition: 'background 0.1s ease',
}

const ROW_BORDER = { borderBottom: '1px solid rgba(0,0,0,0.05)' }

const ROW_HOVER_STYLE = { backgroundColor: 'rgba(0,0,0,0.03)' }

const CHECK_MUTED = { color: 'var(--muted-foreground)' }

const NEW_SECTION_STYLE = {
  borderTop: '1px solid rgba(0,0,0,0.1)',
  marginTop: 6,
  paddingTop: 8,
  paddingBottom: 4,
  paddingLeft: 14,
  paddingRight: 12,
}

export function CategoryAssignPopover({
  anchorRef,
  categories,
  assignedCategories,
  onToggle,
  onCreateAndAssign,
  onClose,
}) {
  const listRef = useRef(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newName, setNewName] = useState('')

  const existingCategories = (categories || []).filter((c) => c !== 'All')
  const assignedSet = new Set((assignedCategories || []).map((s) => String(s).trim()).filter(Boolean))

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!anchorRef?.current || !listRef?.current) return
      const anchor = anchorRef.current
      const popover = listRef.current
      if (
        !anchor.contains(e.target) &&
        !popover.contains(e.target)
      ) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  const handleToggle = (cat) => {
    onToggle?.(cat)
  }

  const handleAddNew = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setIsAddingNew(false)
      setNewName('')
      return
    }
    onCreateAndAssign?.(trimmed)
    setNewName('')
    setIsAddingNew(false)
  }

  return (
    <div ref={listRef} style={POPOVER_WRAPPER} role="dialog" aria-label="Assign to categories">
      <div style={POPOVER_ARROW} aria-hidden />
      <div style={POPOVER_STYLE}>
      {existingCategories.map((cat, index) => {
        const isAssigned = assignedSet.has(cat)
        const isLast = index === existingCategories.length - 1
        return (
          <button
            key={cat}
            type="button"
            style={{ ...ROW_BASE, ...(isLast ? {} : ROW_BORDER) }}
            onClick={() => handleToggle(cat)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, ROW_HOVER_STYLE)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="truncate" style={{ flex: 1, minWidth: 0 }}>{cat}</span>
            {isAssigned && (
              <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" style={CHECK_MUTED} strokeWidth={2.5} />
            )}
          </button>
        )
      })}
      <div style={NEW_SECTION_STYLE}>
        {!isAddingNew ? (
          <button
            type="button"
            style={{
              ...ROW_BASE,
              padding: '6px 12px 6px 14px',
              width: '100%',
              justifyContent: 'flex-start',
              color: 'var(--muted-foreground)',
            }}
            onClick={() => setIsAddingNew(true)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, ROW_HOVER_STYLE)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0 mr-2" style={CHECK_MUTED} />
            <span style={{ color: 'var(--muted-foreground)' }}>New category</span>
          </button>
        ) : (
          <div
            className="flex items-stretch flex-nowrap rounded-md overflow-hidden border border-stroke focus-within:ring-1 focus-within:ring-inset focus-within:ring-stroke"
            style={{ borderColor: 'rgba(0,0,0,0.12)' }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew()
                if (e.key === 'Escape') {
                  setIsAddingNew(false)
                  setNewName('')
                }
              }}
              placeholder="Category name..."
              autoFocus
              className="category-popover-new-input flex-1 min-w-0 py-1.5 px-2.5 font-serif focus:outline-none bg-transparent"
            />
            <button
              type="button"
              onClick={handleAddNew}
              className="flex-shrink-0 text-xs font-serif py-1.5 px-2.5 border-l border-stroke hover:bg-muted/50 whitespace-nowrap bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            >
              Add
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
