import { useState, useRef, useEffect, memo } from 'react'
import { Card } from './ui/Card'
import Tooltip from './ui/Tooltip'
import { MoreVertical, Copy, Trash2, CheckCircle, Languages, User, LayoutList, Send, Sparkles, Pencil } from 'lucide-react'
import { FaReply } from 'react-icons/fa'
import { RiChatFollowUpLine } from 'react-icons/ri'
import { MdSubdirectoryArrowRight } from 'react-icons/md'
import { TbWand, TbWandOff } from 'react-icons/tb'
import { translateText } from '../services/translation'
import { getReflectQuestion } from '../services/api'

// Exact category names for display (backend stores single-word tokens: IDEA, TASK, etc.)
const THOUGHT_TYPE_DISPLAY_NAMES = {
  IDEA: 'Ideas',
  OBSERVATION: 'Observations',
  TASK: 'Tasks & Intentions',
  QUESTION: 'Questions',
  REFERENCE: 'References',
  REFLECTION: 'Feelings & Reflections',
  EMOTION: 'Feelings & Reflections', // legacy; new type is REFLECTION
  PLAN: 'Plans',
}

function ThoughtCardInner({ thought, onDelete, onOpenAiPrompts, onTagClick, onAddFollowUp, onDeleteFollowUp, onEditFollowUp, onSaveEdit, activeTags }) {
  const [showRaw, setShowRaw] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTranslated, setIsTranslated] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  const [followUpText, setFollowUpText] = useState('')
  const [respondingToAiQuestion, setRespondingToAiQuestion] = useState(null) // when follow-up was pre-filled from AI question
  const [aiQuestion, setAiQuestion] = useState(null)
  const [isLoadingReflect, setIsLoadingReflect] = useState(false)
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [editedRawText, setEditedRawText] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const menuRef = useRef(null)
  const followUpInputRef = useRef(null)
  const editTextareaRef = useRef(null)
  const [editingFollowUpIndex, setEditingFollowUpIndex] = useState(null)
  const [editingFollowUpDraft, setEditingFollowUpDraft] = useState('')
  const editFollowUpTextareaRef = useRef(null)

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

  useEffect(() => {
    if (showFollowUpInput && followUpInputRef.current) {
      const t = setTimeout(() => followUpInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [showFollowUpInput])

  useEffect(() => {
    if (isEditingCard && editTextareaRef.current) {
      const t = setTimeout(() => editTextareaRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isEditingCard])

  // Auto-grow edit textarea to fit content (no fixed height / internal scroll)
  useEffect(() => {
    const el = editTextareaRef.current
    if (!el || !isEditingCard) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(200, el.scrollHeight)}px`
  }, [isEditingCard, editedRawText])

  // Auto-grow follow-up edit textarea to fit content
  useEffect(() => {
    const el = editFollowUpTextareaRef.current
    if (!el || editingFollowUpIndex == null) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(40, el.scrollHeight)}px`
  }, [editingFollowUpIndex, editingFollowUpDraft])

  const handleSubmitFollowUp = () => {
    const text = followUpText.trim()
    if (!text || !onAddFollowUp) return
    const meta = respondingToAiQuestion ? { respondingToAiQuestion } : undefined
    onAddFollowUp(thought.id, text, meta)
    setFollowUpText('')
    setRespondingToAiQuestion(null)
    setShowFollowUpInput(false)
  }

  const handleAiQuestionClick = () => {
    if (!aiQuestion) return
    setRespondingToAiQuestion(aiQuestion)
    setShowFollowUpInput(true)
    setTimeout(() => followUpInputRef.current?.focus(), 80)
  }

  const handleFollowUpChange = (e) => {
    const next = e.target.value
    setFollowUpText(next)
    if (respondingToAiQuestion !== null && !next.trim()) setRespondingToAiQuestion(null)
  }

  const handleReflectClick = async () => {
    setIsLoadingReflect(true)
    try {
      const thoughtText = thought.cleaned_text || thought.content || ''
      const followUpsList = thought.follow_ups ?? thought.followUps ?? []
      const question = await getReflectQuestion(thoughtText, followUpsList)
      setAiQuestion(question || null)
    } catch (err) {
      console.error('Reflect question failed:', err)
      setAiQuestion(null)
    } finally {
      setIsLoadingReflect(false)
    }
  }

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
  // Support both snake_case (Supabase) and camelCase; treat empty string as no type
  const thoughtTypeRaw = (thought.thought_type || thought.thoughtType || '').trim() || null
  const thoughtTypeLabel = thoughtTypeRaw
    ? (THOUGHT_TYPE_DISPLAY_NAMES[thoughtTypeRaw.toUpperCase()] ?? thoughtTypeRaw.charAt(0).toUpperCase() + thoughtTypeRaw.slice(1).toLowerCase())
    : null

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
      {isSavingEdit && (
        <div
          className="absolute inset-0 rounded-[inherit] flex items-center justify-center z-10"
          style={{ backgroundColor: 'var(--card)', opacity: 0.92 }}
          aria-live="polite"
          aria-busy="true"
        >
          <span className="text-sm font-serif" style={{ color: 'var(--muted-foreground)' }}>Reprocessing…</span>
        </div>
      )}
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
          {!isEditingCard && (
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
          )}
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
                {onSaveEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setEditedRawText(thought.raw_transcript || thought.content || '')
                      setIsEditingCard(true)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
                    style={{ color: 'var(--ink)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
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

      {aiQuestion && (
        <button
          type="button"
          onClick={handleAiQuestionClick}
          className="flex items-center gap-2 mb-3 text-xs font-serif italic tracking-wide text-left w-full rounded transition-colors cursor-pointer hover:opacity-80 focus:outline-none focus:ring-0 border-0 bg-transparent p-0"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline'
            e.currentTarget.style.color = 'var(--ink)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
          aria-label="Use this question as follow-up"
        >
          <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'inherit' }} />
          <span>{aiQuestion}</span>
        </button>
      )}

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

      {isEditingCard ? (
        <>
          <textarea
            ref={editTextareaRef}
            value={editedRawText}
            onChange={(e) => setEditedRawText(e.target.value)}
            disabled={isSavingEdit}
            className="block w-full min-w-0 text-sm sm:text-base leading-relaxed font-serif text-pretty mb-2 resize-none overflow-hidden py-1 border-0 rounded bg-transparent focus:outline-none focus:ring-0"
            style={{
              color: 'var(--ink)',
              backgroundColor: 'transparent',
              minHeight: 200
            }}
            placeholder="Raw transcript..."
            aria-label="Edit raw transcript"
          />
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={async () => {
                const text = editedRawText.trim()
                if (!text || !onSaveEdit) return
                setIsSavingEdit(true)
                try {
                  await onSaveEdit(thought.id, text)
                  setIsEditingCard(false)
                } catch (err) {
                  console.error('Failed to save edit:', err)
                } finally {
                  setIsSavingEdit(false)
                }
              }}
              disabled={isSavingEdit || !editedRawText.trim()}
              className="px-3 py-1.5 text-sm font-serif rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: 'var(--stroke)',
                backgroundColor: 'var(--muted)',
                color: 'var(--ink)'
              }}
            >
              {isSavingEdit ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isSavingEdit) return
                setIsEditingCard(false)
                setEditedRawText('')
              }}
              disabled={isSavingEdit}
              className="px-3 py-1.5 text-sm font-serif rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: 'var(--stroke)',
                backgroundColor: 'transparent',
                color: 'var(--muted-foreground)'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
      <p className="text-sm sm:text-base leading-relaxed font-serif text-ink text-pretty mb-4" style={{ color: 'var(--ink)' }}>
        {renderBodyWithUnderlines(displayText)}
      </p>

      {thought.tags && thought.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {thought.tags.map((tag) => {
            const isTagActive = Boolean(
              onTagClick &&
              Array.isArray(activeTags) &&
              activeTags.some((t) => String(t).trim().toLowerCase() === tag.toLowerCase())
            )
            return onTagClick ? (
              <button
                key={tag}
                type="button"
                onClick={(e) => { e.preventDefault(); onTagClick(tag) }}
                className="relative overflow-hidden px-2 py-1 text-xs font-serif leading-tight border border-stroke rounded text-muted-foreground cursor-pointer transition-colors hover:border-ink hover:text-ink inline-block align-baseline min-h-0"
                style={{
                  borderColor: 'var(--stroke)',
                  color: 'var(--muted-foreground)'
                }}
              >
                <span
                  className="absolute inset-0 rounded transition duration-200"
                  style={{
                    backgroundColor: 'var(--muted)',
                    filter: isTagActive ? 'brightness(0.85)' : 'none'
                  }}
                  aria-hidden
                />
                <span className="relative z-10">{tag}</span>
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
          })}
        </div>
      )}

      {(mentionList.length > 0 || thoughtTypeLabel) && (
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
          {mentionList.length > 0 && thoughtTypeLabel && (
            <span className="w-px h-3 bg-stroke shrink-0" style={{ backgroundColor: 'var(--stroke)' }} aria-hidden />
          )}
          {thoughtTypeLabel && (
            <div className="flex items-center gap-1.5">
              <LayoutList className="w-3 h-3 text-muted-foreground shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <span className="text-xs font-serif text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
                {thoughtTypeLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {(() => {
        const followUpsList = thought.follow_ups ?? thought.followUps
        const list = Array.isArray(followUpsList) ? followUpsList : []
        if (list.length === 0) return null
        return (
        <div className="mb-3 space-y-2">
          {list.map((fu, i) => {
            const fuText = typeof fu === 'string' ? fu : (fu?.text ?? '')
            const fuRespondingToAi = fu && typeof fu === 'object' ? (fu.responding_to_ai ?? fu.respondingToAi) : null
            const fuDate = fu && typeof fu === 'object' && fu.created_at
              ? new Date(fu.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : null
            return (
            <div
              key={i}
              className="relative flex items-start gap-2 pl-3 py-2 pr-8 rounded-lg border-l-2 font-serif text-sm"
              style={{
                borderLeftColor: 'var(--stroke)',
                backgroundColor: 'var(--muted)',
                color: 'var(--ink)'
              }}
            >
              <MdSubdirectoryArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {fuRespondingToAi && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-serif italic rounded-r border-l-[3px] py-2 px-3 mb-2"
                    style={{
                      color: 'var(--muted-foreground)',
                      borderLeftColor: 'rgba(100, 116, 139, 0.65)',
                      backgroundColor: 'rgba(100, 116, 139, 0.1)'
                    }}
                  >
                    <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                    <span className="leading-snug">{fuRespondingToAi}</span>
                  </div>
                )}
                {fuDate && (
                  <span className="text-xs tracking-wide opacity-80" style={{ color: 'var(--muted-foreground)' }}>{fuDate}</span>
                )}
                {editingFollowUpIndex === i ? (
                  <>
                    <textarea
                      ref={editFollowUpTextareaRef}
                      value={editingFollowUpDraft}
                      onChange={(e) => setEditingFollowUpDraft(e.target.value)}
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
                          if (onEditFollowUp) {
                            onEditFollowUp(thought.id, i, editingFollowUpDraft.trim())
                            setEditingFollowUpIndex(null)
                            setEditingFollowUpDraft('')
                          }
                        }}
                        className="text-xs font-serif border-0 bg-transparent cursor-pointer py-0 px-0"
                        style={{ color: 'rgba(100, 116, 139, 0.9)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingFollowUpIndex(null)
                          setEditingFollowUpDraft('')
                        }}
                        className="text-xs font-serif border-0 bg-transparent cursor-pointer py-0 px-0"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <span>{fuText}</span>
                )}
              </div>
              {editingFollowUpIndex !== i && (
                <div className="absolute flex flex-row items-center gap-0.5" style={{ bottom: 8, right: 10 }}>
                  {onEditFollowUp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingFollowUpIndex(i)
                        setEditingFollowUpDraft(fuText)
                        setTimeout(() => editFollowUpTextareaRef.current?.focus(), 50)
                      }}
                      className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center"
                      style={{
                        color: 'var(--muted-foreground)',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
                      aria-label="Edit follow-up"
                    >
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  {onDeleteFollowUp && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteFollowUp(thought.id, i) }}
                      className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center"
                      style={{
                        color: 'var(--muted-foreground)',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#e57373' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
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
      })()}

      {!isEditingCard && onAddFollowUp && showFollowUpInput && (
        <div className="min-w-0 flex flex-col" style={{ marginTop: '20px' }}>
          {respondingToAiQuestion && (
            <div
              className="flex items-center gap-1.5 text-[11px] font-serif italic rounded-full px-2 py-0.5 w-fit"
              style={{
                color: 'var(--muted-foreground)',
                backgroundColor: 'var(--muted)',
                marginBottom: '8px'
              }}
            >
              <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              Responding to AI prompt
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={followUpInputRef}
              type="text"
              value={followUpText}
              onChange={handleFollowUpChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmitFollowUp()
                }
                if (e.key === 'Escape') {
                  setShowFollowUpInput(false)
                  setFollowUpText('')
                  setRespondingToAiQuestion(null)
                }
              }}
              placeholder="Add a follow-up..."
              className="flex-1 min-w-0 px-3 py-2 rounded-md border text-sm font-serif focus:outline-none"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--stroke)',
                color: 'var(--ink)'
              }}
              aria-label="Follow-up comment"
            />
            <Tooltip text="Submit follow-up" position="bottom">
              <button
                type="button"
                onClick={handleSubmitFollowUp}
                disabled={!followUpText.trim()}
                className="p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                aria-label="Submit follow-up"
              >
                <Send className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
        </>
      )}

      <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6 flex items-center gap-2">
        {!isEditingCard && onAddFollowUp && (
          showFollowUpInput ? null : (
            <Tooltip text="Add follow-up" position="bottom">
              <button
                type="button"
                onClick={() => setShowFollowUpInput(true)}
                className="p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center group"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink)'
                  e.currentTarget.style.backgroundColor = 'var(--muted)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                aria-label="Add follow-up"
              >
                <RiChatFollowUpLine className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </Tooltip>
          )
        )}

        {!isEditingCard && (
        <Tooltip text="AI reflection question" position="bottom">
          <button
            type="button"
            onClick={handleReflectClick}
            disabled={isLoadingReflect}
            className="p-2 rounded-md transition-all duration-200 hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
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

        {!isEditingCard && translationEnabled && (
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

        {!isEditingCard && (
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
        )}
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
