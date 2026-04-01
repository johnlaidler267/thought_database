import { Copy, Languages, Sparkles, ChevronsDownUp, PenLine } from 'lucide-react'
import { RiChatFollowUpLine } from 'react-icons/ri'
import Tooltip from '../ui/Tooltip'
import { actionButtonMuted } from './styles'

const actionButtonClass =
  'p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group'

export function ActionBar({
  isEditingCard,
  showFollowUpInput,
  onAddFollowUp,
  onShowFollowUpInput,
  onReflectClick,
  isLoadingReflect,
  onDistillClick,
  isDistilling,
  distillationLevel,
  translationEnabled,
  isTranslated,
  isTranslating,
  onTranslate,
  onCopy,
}) {
  const handleFollowUpMouseEnter = (e) => {
    e.currentTarget.style.color = 'var(--ink)'
    e.currentTarget.style.backgroundColor = 'var(--muted)'
  }
  const handleFollowUpMouseLeave = (e) => {
    e.currentTarget.style.color = 'var(--muted-foreground)'
    e.currentTarget.style.backgroundColor = 'transparent'
  }

  const distillColor =
    distillationLevel > 0 ? 'rgba(100, 116, 139, 0.95)' : 'var(--muted-foreground)'

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-end gap-2">
      {!isEditingCard && onAddFollowUp && !showFollowUpInput && (
        <Tooltip text="Add follow-up" position="bottom">
          <button
            type="button"
            onClick={(e) => { onShowFollowUpInput(); e.currentTarget.blur() }}
            className="p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center group"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={handleFollowUpMouseEnter}
            onMouseLeave={handleFollowUpMouseLeave}
            aria-label="Add follow-up"
          >
            <RiChatFollowUpLine className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </Tooltip>
      )}

      {!isEditingCard && (
        <Tooltip text="AI reflection question" position="bottom">
          <button
            type="button"
            onClick={(e) => { onReflectClick(); e.currentTarget.blur() }}
            disabled={isLoadingReflect}
            className={actionButtonClass}
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => actionButtonMuted(e, true)}
            onMouseLeave={(e) => actionButtonMuted(e, false)}
            aria-label="Ask AI reflection question"
          >
            {isLoadingReflect ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </Tooltip>
      )}

      {!isEditingCard && (
        <Tooltip text="Distill" position="bottom">
          <button
            type="button"
            onClick={(e) => { onDistillClick(); e.currentTarget.blur() }}
            disabled={isDistilling || isRewriting}
            className={actionButtonClass}
            style={{ color: distillColor }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = distillColor
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Distill thought"
          >
            {isDistilling ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronsDownUp className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </Tooltip>
      )}

      {!isEditingCard && (
        <Tooltip text="Rewrite for clarity" position="bottom">
          <button
            type="button"
            onClick={(e) => { onRewriteClick(); e.currentTarget.blur() }}
            disabled={isRewriting || isDistilling}
            className={actionButtonClass}
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--muted-foreground)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Rewrite for clarity"
          >
            {isRewriting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <PenLine className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </Tooltip>
      )}

      {!isEditingCard && translationEnabled && (
        <Tooltip text={isTranslated ? 'Show original' : 'Translate'} position="bottom">
          <button
            type="button"
            onClick={(e) => { onTranslate(); e.currentTarget.blur() }}
            disabled={isTranslating}
            className="p-2 rounded-md transition-all duration-200 hover:bg-muted group flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: isTranslated ? 'var(--ink)' : 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isTranslated) e.currentTarget.style.color = 'var(--muted-foreground)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label={isTranslated ? 'Show original text' : 'Translate text'}
          >
            {isTranslating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Languages className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>
        </Tooltip>
      )}

      {!isEditingCard && (
        <Tooltip text="Copy" position="bottom">
          <button
            type="button"
            onClick={(e) => { onCopy(); e.currentTarget.blur() }}
            className="p-2 rounded-md transition-all duration-200 hover:bg-muted group flex items-center justify-center"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--ink)'
              e.currentTarget.style.backgroundColor = 'var(--muted)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--muted-foreground)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Copy to clipboard"
          >
            <Copy className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
