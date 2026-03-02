import { useState } from 'react'
import { X } from 'lucide-react'

/**
 * One-time inline nudge when a new person is first created: "Who is [Name]?"
 * Or, after "No, different person": "Got it — who is this [Name]? Add a note (optional)."
 * Slim banner row — light gray background, same alignment as metadata row.
 */
export default function ClarifierPrompt({ displayName, onSubmit, onDismiss, promptMessage, onSkip }) {
  const [draft, setDraft] = useState('')

  const handleSubmit = () => {
    onSubmit?.(draft.trim() || null)
  }

  const handleDismiss = () => {
    if (onSkip) {
      onSkip()
    } else {
      onDismiss?.()
    }
  }

  const rowFontSize = '0.8rem'
  const label = promptMessage != null ? promptMessage : (
    <>Who is <strong style={{ color: 'var(--ink)' }}>{displayName}</strong>?</>
  )

  return (
    <div
      className="flex items-center gap-2 flex-nowrap w-full rounded-lg font-serif tracking-wide"
      style={{
        backgroundColor: '#f5f5f5',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: rowFontSize,
        color: 'var(--muted-foreground)',
      }}
    >
      <span className="shrink-0" style={{ color: 'var(--ink)' }}>
        {label}
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. brother, K."
        className="flex-1 min-w-0 py-0.5 bg-transparent border-0 border-b font-serif focus:outline-none focus:ring-0 placeholder:opacity-60"
        style={{
          borderBottomColor: 'var(--stroke)',
          color: 'var(--ink)',
          fontSize: rowFontSize,
        }}
        onFocus={(e) => { e.target.style.borderBottomColor = 'var(--muted-foreground)' }}
        onBlur={(e) => { e.target.style.borderBottomColor = 'var(--stroke)' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') handleDismiss()
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity font-serif py-0.5 border-0 bg-transparent"
        style={{
          color: 'var(--accent-foreground)',
          fontSize: rowFontSize,
        }}
      >
        Save
      </button>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity font-serif py-0.5 border-0 bg-transparent"
          style={{
            color: 'var(--muted-foreground)',
            fontSize: rowFontSize,
          }}
        >
          Skip
        </button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        className="p-0.5 shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
        style={{ color: 'var(--muted-foreground)' }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
