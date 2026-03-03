import { MdSubdirectoryArrowRight } from 'react-icons/md'
import { Pencil, Trash2 } from 'lucide-react'
import { followUpBubble, followUpAiPrompt } from './styles'

function formatFollowUpDate(createdAt) {
  if (!createdAt) return null
  return new Date(createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function FollowUpList({
  followUps,
  thoughtId,
  editingIndex,
  editingDraft,
  onEditingDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteFollowUp,
  editTextareaRef,
}) {
  const list = Array.isArray(followUps) ? followUps : []
  if (list.length === 0) return null

  return (
    <div className="mb-3 space-y-2">
      {list.map((fu, i) => {
        const fuText = typeof fu === 'string' ? fu : fu?.text ?? ''
        const fuRespondingToAi =
          fu && typeof fu === 'object' ? fu.responding_to_ai ?? fu.respondingToAi : null
        const fuDate = fu && typeof fu === 'object' && fu.created_at ? formatFollowUpDate(fu.created_at) : null
        const isEditing = editingIndex === i

        return (
          <div
            key={i}
            className="relative flex items-start gap-2 pl-3 py-2 pr-8 rounded-lg border-l-2 font-serif text-sm"
            style={followUpBubble}
          >
            <MdSubdirectoryArrowRight
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--muted-foreground)' }}
            />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              {fuRespondingToAi && (
                <div
                  className="text-xs font-serif italic rounded-r border-l-[3px] py-2 px-3 mb-2"
                  style={followUpAiPrompt}
                >
                  <span className="leading-snug">{fuRespondingToAi}</span>
                </div>
              )}
              {fuDate && (
                <span className="text-xs tracking-wide opacity-80" style={{ color: 'var(--muted-foreground)' }}>
                  {fuDate}
                </span>
              )}
              {isEditing ? (
                <>
                  <textarea
                    ref={editTextareaRef}
                    value={editingDraft}
                    onChange={(e) => onEditingDraftChange(e.target.value)}
                    className="w-full min-h-0 resize-none overflow-hidden py-0 px-0 border-0 rounded text-sm font-serif leading-relaxed focus:outline-none focus:ring-0 bg-transparent"
                    style={{ color: 'var(--ink)', minHeight: 24 }}
                    rows={1}
                    aria-label="Edit follow-up response"
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSaveEdit(i)
                      }}
                      className="text-xs font-serif border-0 bg-transparent cursor-pointer py-0 px-0"
                      style={{ color: 'rgba(100, 116, 139, 0.9)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none'
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onCancelEdit()
                      }}
                      className="text-xs font-serif border-0 bg-transparent cursor-pointer py-0 px-0"
                      style={{ color: 'var(--muted-foreground)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <span>{fuText}</span>
              )}
            </div>
            {!isEditing && (
              <div className="absolute flex flex-row items-center gap-0.5" style={{ bottom: 8, right: 10 }}>
                {onStartEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onStartEdit(i, fuText)
                    }}
                    className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center"
                    style={{ color: 'var(--muted-foreground)', transition: 'color 0.15s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--ink)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                    aria-label="Edit follow-up"
                  >
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                )}
                {onDeleteFollowUp && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDeleteFollowUp(thoughtId, i)
                    }}
                    className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center"
                    style={{ color: 'var(--muted-foreground)', transition: 'color 0.15s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#e57373'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                    aria-label="Remove follow-up"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
