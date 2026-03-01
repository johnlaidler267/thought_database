import { useState, useRef, useEffect, memo } from 'react'
import { Card } from './ui/Card'
import Tooltip from './ui/Tooltip'
import { MoreVertical, Copy, Trash2, CheckCircle, Languages, User, LayoutList } from 'lucide-react'
import { FaReply } from 'react-icons/fa'
import { TbWand, TbWandOff } from 'react-icons/tb'
import { translateText } from '../services/translation'

function ThoughtCardInner({ thought, onDelete, onOpenAiPrompts, onTagClick }) {
  const [showRaw, setShowRaw] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTranslated, setIsTranslated] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const menuRef = useRef(null)

  const translationEnabled = JSON.parse(localStorage.getItem('translationEnabled') || 'false')
  const translationLanguage = localStorage.getItem('translationLanguage') || 'es'

  const originalText = showRaw ? (thought.raw_transcript || thought.content) : (thought.cleaned_text || thought.content)
  const displayText = isTranslated && translatedText ? translatedText : originalText
  const timestamp = thought.created_at
    ? new Date(thought.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : thought.timestamp || ''

  const duration = thought.duration || ''

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showMenu])

  const handleCopy = async () => {
    try {
      const textToCopy = isTranslated && translatedText ? translatedText : (thought.cleaned_text || thought.content)
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDelete = () => {
    setShowMenu(false)
    onDelete(thought.id)
  }

  const handleTranslate = async () => {
    if (!translationEnabled) return

    if (isTranslated) {
      setIsTranslated(false)
      return
    }

    setIsTranslating(true)
    try {
      const translated = await translateText(originalText, translationLanguage)
      setTranslatedText(translated)
      setIsTranslated(true)
    } catch (error) {
      console.error('Translation failed:', error)
      alert('Failed to translate. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  // Underline mention names in the body text (longest names first to avoid partial matches)
  const mentionList = Array.isArray(thought.mentions)
    ? thought.mentions
    : typeof thought.mentions === 'string'
      ? (thought.mentions ? [thought.mentions] : [])
      : []
  const renderBodyWithUnderlines = (text) => {
    if (!text || mentionList.length === 0) return text
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const sorted = [...mentionList].sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))
    const pattern = new RegExp('\\b(' + sorted.map(escapeRegex).join('|') + ')\\b', 'gi')
    const parts = text.split(pattern)
    return parts.map((part, i) => {
      if (i % 2 === 0) return part
      return (
        <span key={`${i}-${part}`} className="mention-highlight" style={{ cursor: 'default' }}>
          {part}
        </span>
      )
    })
  }

  return (
    <Card
      className="border-stroke bg-card hover:bg-muted/30 transition-colors duration-200 pt-6 px-6 pb-14 shadow-none relative"
      style={{
        borderColor: 'var(--stroke)',
        backgroundColor: 'var(--card)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-serif" style={{ color: 'var(--muted-foreground)' }}>
          <span className="tracking-wide">{timestamp}</span>
          {duration && (
            <>
              <span className="w-px h-3 bg-stroke" style={{ backgroundColor: 'var(--stroke)' }} />
              <span className="tracking-wide">{duration}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip text={showRaw ? 'View cleaned version' : 'View raw transcript'} position="bottom">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-muted-foreground hover:text-ink transition-colors flex items-center justify-center p-1"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
              aria-label={showRaw ? 'View cleaned version' : 'View raw transcript'}
            >
              {showRaw ? <TbWand className="w-4 h-4" /> : <TbWandOff className="w-4 h-4" />}
            </button>
          </Tooltip>
          <div className="relative flex items-center justify-center" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-muted-foreground hover:text-ink transition-colors flex items-center justify-center p-1"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 min-w-[140px] rounded-md border shadow-lg z-10"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--stroke)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
                  style={{ color: 'var(--ink)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--muted)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {thought.responding_to && (
        <div
          className="group mb-3 px-3 pt-2 pb-1 rounded-lg border font-serif text-sm flex items-start gap-4"
          style={{
            borderColor: 'var(--stroke)',
            backgroundColor: 'var(--muted)',
            color: 'var(--muted-foreground)'
          }}
        >
          <FaReply className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
          <p className="italic text-muted-foreground flex-1" style={{ color: 'var(--muted-foreground)' }}>{thought.responding_to}</p>
        </div>
      )}

      <p className="text-sm sm:text-base leading-relaxed font-serif text-ink text-pretty mb-4" style={{ color: 'var(--ink)' }}>
        {renderBodyWithUnderlines(displayText)}
      </p>

      {thought.tags && thought.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {thought.tags.map((tag) => (
            onTagClick ? (
              <button
                key={tag}
                type="button"
                onClick={(e) => { e.preventDefault(); onTagClick(tag) }}
                className="px-2 py-1 text-xs font-serif leading-tight border border-stroke rounded bg-muted/50 text-muted-foreground cursor-pointer transition-colors hover:border-ink hover:text-ink inline-block align-baseline min-h-0"
                style={{
                  borderColor: 'var(--stroke)',
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)'
                }}
              >
                {tag}
              </button>
            ) : (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-serif leading-tight border border-stroke rounded bg-muted/50 text-muted-foreground"
                style={{
                  borderColor: 'var(--stroke)',
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)'
                }}
              >
                {tag}
              </span>
            )
          ))}
        </div>
      )}

      {(mentionList.length > 0 || thought.thought_type) && (
        <div className="flex items-center gap-2 flex-wrap mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {mentionList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-muted-foreground shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <div className="flex flex-wrap gap-1.5">
                {mentionList.map((name) => (
                  <span
                    key={String(name)}
                    className="text-xs font-serif text-muted-foreground"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {mentionList.length > 0 && thought.thought_type && (
            <span className="w-px h-3 bg-stroke shrink-0" style={{ backgroundColor: 'var(--stroke)' }} aria-hidden />
          )}
          {thought.thought_type && (
            <div className="flex items-center gap-1.5">
              <LayoutList className="w-3 h-3 text-muted-foreground shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <span className="text-xs font-serif text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
                {thought.thought_type}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 flex items-center gap-2">
        {translationEnabled && (
          <Tooltip text={isTranslated ? 'Show original' : 'Translate'} position="bottom">
            <button
              onClick={handleTranslate}
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

        <Tooltip text="Copy" position="bottom">
          <button
            onClick={handleCopy}
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
      </div>

      {copied && (
        <div
          className="absolute bottom-16 right-4 px-4 py-2.5 rounded-md shadow-lg z-20 flex items-center gap-2 transition-all duration-200"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--stroke)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'fadeInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <CheckCircle className="w-4 h-4" style={{ color: 'var(--ink)' }} />
          <span className="text-sm font-serif" style={{ color: 'var(--ink)' }}>Copied</span>
        </div>
      )}
    </Card>
  )
}

export const ThoughtCard = memo(ThoughtCardInner)
