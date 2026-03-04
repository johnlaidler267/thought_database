import { useState, useRef, useEffect } from 'react'
import { X, Check, XCircle } from 'lucide-react'
import { FaReply } from 'react-icons/fa'
import { ThoughtStartersFlow } from './ThoughtStartersFlow'

const STORAGE_KEY = 'vellum_draft_pending'

/**
 * Self-contained transcript editor so typing only re-renders this component,
 * not the whole HomePage (fixes keyboard input lag).
 */
export function TranscriptEditor({
  initialTranscript,
  onSubmit,
  onCancel,
  loading,
  selectedPrompt,
  onClearPrompt,
  showAiPrompts,
  onSelectPrompt,
  aiPromptsEditorRef,
  skipPersistRef,
}) {
  const [draftTranscript, setDraftTranscript] = useState(initialTranscript ?? '')
  const textareaRef = useRef(null)
  const draftRef = useRef(draftTranscript)

  draftRef.current = draftTranscript

  // Focus textarea when mounted (e.g. after opening from Type or recording)
  useEffect(() => {
    const t = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const len = textareaRef.current.value.length
        textareaRef.current.setSelectionRange(len, len)
      }
    }, 100)
    return () => clearTimeout(t)
  }, [])

  // Persist draft on unmount (navigate away) unless we're closing due to submit
  useEffect(() => {
    return () => {
      if (skipPersistRef?.current) return
      const latest = draftRef.current
      if (latest && typeof latest === 'string' && latest.trim()) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ transcript: latest }))
        } catch {}
      }
    }
  }, [skipPersistRef])

  const handleSubmit = () => {
    const trimmed = draftTranscript.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        {selectedPrompt && (
          <div
            className="group relative flex items-center gap-4 mb-3 pl-3 pr-14 sm:pr-10 py-2 rounded-lg border font-serif text-sm"
            style={{
              borderColor: 'var(--stroke)',
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            }}
          >
            <span className="flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
              <FaReply className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <p className="italic text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>{selectedPrompt}</p>
            </span>
            <button
              type="button"
              onClick={onClearPrompt}
              className="absolute top-1/2 right-1 -translate-y-1/2 p-0.5 rounded hover:bg-muted/80 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              aria-label="Clear prompt"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {showAiPrompts && (
          <div ref={aiPromptsEditorRef} className="mb-3 w-full max-w-[min(90vw,28rem)]">
            <ThoughtStartersFlow
              selectedPrompt={selectedPrompt}
              onSelectPrompt={onSelectPrompt}
              useInlineHover={false}
            />
          </div>
        )}
        <div className="mb-2" aria-hidden />
        <textarea
          ref={textareaRef}
          value={draftTranscript}
          onChange={(e) => setDraftTranscript(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-lg border resize-none font-serif text-base leading-relaxed focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--stroke)',
            color: 'var(--ink)',
            minHeight: '120px',
            maxHeight: '300px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--ink)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--stroke)'
          }}
          placeholder="Edit your transcript here..."
          rows={4}
        />
        <div className="flex items-center justify-end mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border font-serif text-sm transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--stroke)',
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.borderColor = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.borderColor = 'var(--stroke)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!draftTranscript.trim() || loading}
              className="px-4 py-2 rounded-lg font-serif text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--ink)',
                color: 'var(--paper)',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--muted-foreground)'
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--ink)'
                }
              }}
            >
              <Check className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
