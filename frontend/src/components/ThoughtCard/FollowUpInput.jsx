import { Send } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import Tooltip from '../ui/Tooltip'
import { followUpInputWrap, actionButtonMuted } from './styles'

export function FollowUpInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  inputRef,
  respondingToAiQuestion,
}) {
  return (
    <div className="min-w-0 flex flex-col" style={{ marginTop: '20px' }}>
      {respondingToAiQuestion && (
        <div
          className="flex items-center gap-1.5 text-[11px] font-serif italic rounded-full px-2 py-0.5 w-fit"
          style={{
            color: 'var(--muted-foreground)',
            backgroundColor: 'var(--muted)',
            marginBottom: '8px',
          }}
        >
          <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
          Responding to AI prompt
        </div>
      )}
      <div className="flex items-center gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Add a follow-up..."
          rows={1}
          className="flex-1 min-w-0 px-3 py-2 rounded-md border text-sm font-serif focus:outline-none resize-none overflow-hidden min-h-0"
          style={followUpInputWrap}
          aria-label="Follow-up comment"
        />
        <Tooltip text="Submit follow-up" position="bottom">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => actionButtonMuted(e, true)}
            onMouseLeave={(e) => actionButtonMuted(e, false)}
            aria-label="Submit follow-up"
          >
            <Send className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
