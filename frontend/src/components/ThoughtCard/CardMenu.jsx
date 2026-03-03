import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { menuDropdown, menuItemHover, iconButtonMuted } from './styles'

export function CardMenu({
  menuRef,
  isOpen,
  onToggle,
  canEdit,
  displayText,
  onEditClick,
  onDeleteClick,
}) {
  const handleEditClick = () => {
    onToggle(false)
    onEditClick(displayText)
  }

  return (
    <div className="relative flex items-center justify-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="text-muted-foreground hover:text-ink transition-colors flex items-center justify-center p-1"
        style={{ color: 'var(--muted-foreground)' }}
        onMouseEnter={(e) => iconButtonMuted(e, true)}
        onMouseLeave={(e) => iconButtonMuted(e, false)}
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[140px] rounded-md border shadow-lg z-10"
          style={menuDropdown}
        >
          {canEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
              style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => menuItemHover(e, true)}
              onMouseLeave={(e) => menuItemHover(e, false)}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteClick}
            className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
            style={{ color: 'var(--ink)' }}
            onMouseEnter={(e) => menuItemHover(e, true)}
            onMouseLeave={(e) => menuItemHover(e, false)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
