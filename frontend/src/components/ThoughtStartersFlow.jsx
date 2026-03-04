import { useState, useCallback } from 'react'
import { Check, ArrowLeft, Loader2, ChevronRight, Mic, Keyboard } from 'lucide-react'
import { THOUGHT_STARTER_INTENTS, getCachedPrompts, setCachedPrompts } from '../constants/thoughtStarters'
import { getThoughtStarterPrompts } from '../services/api'

const MODAL_STYLES = {
  background: '#F2F2F7',
  maxHeight: 'min(55vh, 32rem, calc(100vh - 10rem))',
  borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

const CARD_STYLES = {
  display: 'flex',
  alignItems: 'center',
  background: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  padding: '14px 16px',
  fontSize: '17px',
  fontWeight: 500,
  color: '#1C1C1E',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
}

/**
 * Dynamic Thought Starters flow:
 * 1. User sees 5 intent options (large, tappable)
 * 2. User taps one → AI generates 5 prompts (or show cached)
 * 3. User taps a prompt → selects it (highlighted); if showCaptureChoice, shows Record + Type; else calls onSelectPrompt
 * 4. User taps Record or Type → initiates capture, modal dismisses
 */
export function ThoughtStartersFlow({
  selectedPrompt,
  onSelectPrompt,
  onRecordWithPrompt,
  onTypeWithPrompt,
  useInlineHover = false,
}) {
  const [selectedIntent, setSelectedIntent] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingPrompt, setPendingPrompt] = useState(null)

  const showCaptureChoice = Boolean(onRecordWithPrompt && onTypeWithPrompt)

  const loadPromptsForIntent = useCallback(async (intent) => {
    const cached = getCachedPrompts(intent)
    if (cached && cached.length > 0) {
      setPrompts(cached)
      setSelectedIntent(intent)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getThoughtStarterPrompts(intent)
      if (result && result.length > 0) {
        setCachedPrompts(intent, result)
        setPrompts(result)
        setSelectedIntent(intent)
      } else {
        setError('No prompts generated. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBack = useCallback(() => {
    if (pendingPrompt) {
      setPendingPrompt(null)
    } else {
      setSelectedIntent(null)
      setPrompts([])
      setError(null)
    }
  }, [pendingPrompt])

  // Step 1: Intent selector
  if (!selectedIntent && !loading) {
    return (
      <div
        className="thought-starters-modal thought-starters-modal-enter pt-6 pr-4 pb-4 pl-4 overflow-y-auto"
        style={MODAL_STYLES}
      >
        <p
          className="thought-starters-title mb-4"
          style={{ color: '#8E8E93', fontSize: '13px', fontWeight: 400 }}
        >
          Thought starters
        </p>
        <div className="thought-starters-cards" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {THOUGHT_STARTER_INTENTS.map((intent) => (
            <button
              key={intent}
              onClick={() => loadPromptsForIntent(intent)}
              className="thought-starters-card"
              style={CARD_STYLES}
            >
              <span style={{ flex: 1, textAlign: 'left' }}>{intent}</span>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#8E8E93' }} />
            </button>
          ))}
        </div>
        <style>{`
          .thought-starters-modal-enter {
            animation: thought-starters-fade-in 100ms ease-out forwards;
          }
          @keyframes thought-starters-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .thought-starters-card {
            display: flex;
            align-items: center;
            width: 100%;
            border: none;
            cursor: pointer;
            transition: background-color 0.15s ease;
            animation: thought-starters-card-in 150ms ease-out forwards;
            opacity: 0;
            transform: translateY(6px);
          }
          .thought-starters-card:nth-child(1) { animation-delay: 80ms; }
          .thought-starters-card:nth-child(2) { animation-delay: 130ms; }
          .thought-starters-card:nth-child(3) { animation-delay: 180ms; }
          .thought-starters-card:nth-child(4) { animation-delay: 230ms; }
          .thought-starters-card:nth-child(5) { animation-delay: 280ms; }
          @keyframes thought-starters-card-in {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .thought-starters-card:hover {
            background-color: #E5E5EA !important;
          }
          .thought-starters-card:active {
            background-color: #E5E5EA !important;
          }
        `}</style>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="thought-starters-modal-enter flex flex-col items-center justify-center py-12 px-4 overflow-y-auto"
        style={MODAL_STYLES}
      >
        <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: '#8E8E93' }} />
        <p className="text-sm font-serif" style={{ color: '#8E8E93' }}>Generating prompts...</p>
      </div>
    )
  }

  // Step 3: Capture choice (Record / Type) when prompt selected and showCaptureChoice
  if (pendingPrompt && showCaptureChoice) {
    return (
      <div
        className="thought-starters-modal thought-starters-modal-enter pt-6 pr-4 pb-4 pl-4 overflow-y-auto"
        style={MODAL_STYLES}
      >
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 rounded transition-colors hover:opacity-70 active:opacity-50"
            style={{ color: '#8E8E93' }}
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p style={{ color: '#8E8E93', fontSize: '13px', fontWeight: 400 }}>
            Thought starters
          </p>
        </div>
        <div
          className="mb-4 px-4 py-3 rounded-xl"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            color: '#1C1C1E',
            fontSize: '15px',
            fontWeight: 500,
            fontStyle: 'italic',
          }}
        >
          {pendingPrompt}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onRecordWithPrompt(pendingPrompt)}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl transition-colors"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              color: '#1C1C1E',
              fontSize: '17px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E5EA' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
            onMouseDown={(e) => { e.currentTarget.style.backgroundColor = '#E5E5EA' }}
            onMouseUp={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
          >
            <Mic className="w-5 h-5" />
            Record
          </button>
          <button
            type="button"
            onClick={() => onTypeWithPrompt(pendingPrompt)}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl transition-colors"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              color: '#1C1C1E',
              fontSize: '17px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E5EA' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
            onMouseDown={(e) => { e.currentTarget.style.backgroundColor = '#E5E5EA' }}
            onMouseUp={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
          >
            <Keyboard className="w-5 h-5" />
            Type
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Prompt list (with back button)
  return (
    <div
      className="thought-starters-modal thought-starters-modal-enter pt-6 pr-4 pb-4 pl-4 overflow-y-auto"
      style={MODAL_STYLES}
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="p-1 rounded transition-colors hover:opacity-70 active:opacity-50"
          style={{ color: '#8E8E93' }}
          aria-label="Back to intents"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p style={{ color: '#8E8E93', fontSize: '13px', fontWeight: 400 }}>
          Thought starters
        </p>
      </div>
      {error ? (
        <p className="text-sm mb-2" style={{ color: '#FF3B30' }}>{error}</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {prompts.map((prompt, i) => {
          const isSelected = selectedPrompt === prompt || pendingPrompt === prompt
          const handleClick = () => {
            if (showCaptureChoice) {
              setPendingPrompt(prompt)
            } else {
              onSelectPrompt(prompt)
            }
          }
          return (
            <button
              key={prompt}
              onClick={handleClick}
              className="thought-starters-prompt-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '12px',
                background: isSelected ? '#E5E5EA' : '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                fontSize: '15px',
                fontWeight: 500,
                color: '#1C1C1E',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = '#E5E5EA'
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E5EA'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = isSelected ? '#E5E5EA' : '#FFFFFF'
              }}
            >
              <span className="flex-shrink-0 w-4 flex items-center justify-center" style={{ minHeight: '1.25em' }}>
                {isSelected && <Check className="w-4 h-4" strokeWidth={2.5} style={{ color: '#1C1C1E' }} />}
              </span>
              <span className="flex-1 min-w-0">{prompt}</span>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#8E8E93' }} />
            </button>
          )
        })}
      </div>
      <style>{`
        .thought-starters-modal-enter {
          animation: thought-starters-fade-in 100ms ease-out forwards;
        }
        @keyframes thought-starters-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .thought-starters-prompt-card {
          animation: thought-starters-card-in 150ms ease-out forwards;
          opacity: 0;
          transform: translateY(6px);
        }
        .thought-starters-prompt-card:nth-of-type(1) { animation-delay: 80ms; }
        .thought-starters-prompt-card:nth-of-type(2) { animation-delay: 130ms; }
        .thought-starters-prompt-card:nth-of-type(3) { animation-delay: 180ms; }
        .thought-starters-prompt-card:nth-of-type(4) { animation-delay: 230ms; }
        .thought-starters-prompt-card:nth-of-type(5) { animation-delay: 280ms; }
        @keyframes thought-starters-card-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
