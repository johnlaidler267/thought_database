import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Card } from './ui/Card'
import { getReflectQuestion } from '../services/api'
import { translateText } from '../services/translation'
import { useDistill, getDistilledFromThought } from '../hooks/useDistill'
import { card, cardBaseClass, mutedFg, stroke } from './ThoughtCard/styles'
import { renderBodyWithUnderlines } from './ThoughtCard/renderBodyWithMentions'
import { RespondingToBubble } from './ThoughtCard/RespondingToBubble'
import { TagRow } from './ThoughtCard/TagRow'
import { PeopleMetadataRow } from './ThoughtCard/PeopleMetadataRow'
import {
  ClarifierBannerPerson,
  ClarifierBannerNewPerson,
  ConfirmationBanners,
  DisambiguationBanners,
} from './ThoughtCard/ClarifierBanners'
import { DistillUndoControls } from './ThoughtCard/DistillUndoControls'
import { EditModeBlock } from './ThoughtCard/EditModeBlock'
import { FollowUpList } from './ThoughtCard/FollowUpList'
import { FollowUpInput } from './ThoughtCard/FollowUpInput'
import { CardMenu } from './ThoughtCard/CardMenu'
import { ActionBar } from './ThoughtCard/ActionBar'
import { CopyToast } from './ThoughtCard/CopyToast'
import { SavingOverlay } from './ThoughtCard/SavingOverlay'
import { AiQuestionButton } from './ThoughtCard/AiQuestionButton'

function ThoughtCardInner({
  thought,
  onDelete,
  onOpenAiPrompts,
  onTagClick,
  onAddFollowUp,
  onDeleteFollowUp,
  onEditFollowUp,
  onDistillStateChange,
  activeTags,
  suggestedTags = [],
  onConfirmSuggestedTag,
  linkedPeople = [],
  onPersonClick,
  onMentionClick,
  clarifierForPersonId,
  clarifierForThoughtId,
  onClarifierSubmit,
  onClarifierDismiss,
  confirmationList = [],
  onConfirmationChoose,
  clarifierForNewPerson = null,
  onNewPersonClarifierComplete,
  disambiguationList = [],
  onDisambiguationChoose,
  categories = [],
  onCategoriesChange,
}) {
  const menuRef = useRef(null)
  const followUpInputRef = useRef(null)
  const editTextareaRef = useRef(null)
  const editFollowUpTextareaRef = useRef(null)

  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTranslated, setIsTranslated] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  const [followUpText, setFollowUpText] = useState('')
  const [respondingToAiQuestion, setRespondingToAiQuestion] = useState(null)
  const [aiQuestion, setAiQuestion] = useState(null)
  const [isLoadingReflect, setIsLoadingReflect] = useState(false)
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [editedRawText, setEditedRawText] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editingFollowUpIndex, setEditingFollowUpIndex] = useState(null)
  const [editingFollowUpDraft, setEditingFollowUpDraft] = useState('')

  const translationEnabled = JSON.parse(localStorage.getItem('translationEnabled') || 'false')
  const translationLanguage = localStorage.getItem('translationLanguage') || 'es'

  const originalText = thought.cleaned_text || thought.content
  const baseDisplayText = isTranslated && translatedText ? translatedText : originalText
  const distilledFromThoughtRaw = getDistilledFromThought(thought)
  const distilledFromThought =
    distilledFromThoughtRaw != null && String(distilledFromThoughtRaw).trim() !== ''
      ? distilledFromThoughtRaw
      : null

  const distill = useDistill(thought, baseDisplayText, onDistillStateChange)
  const displayFromState = distill.displayFromState
  const displayText = (distilledFromThought ?? displayFromState) ?? baseDisplayText

  const timestamp = thought.created_at
    ? new Date(thought.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : thought.timestamp || ''
  const duration = thought.duration || ''

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false)
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const resizeEditTextarea = useCallback(() => {
    const el = editTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => {
    if (!isEditingCard) return
    const el = editTextareaRef.current
    if (!el) return
    const id = requestAnimationFrame(() => resizeEditTextarea())
    return () => cancelAnimationFrame(id)
  }, [isEditingCard, editedRawText, resizeEditTextarea])

  useEffect(() => {
    const el = editFollowUpTextareaRef.current
    if (!el || editingFollowUpIndex == null) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(40, el.scrollHeight)}px`
  }, [editingFollowUpIndex, editingFollowUpDraft])

  useEffect(() => {
    const el = followUpInputRef.current
    if (!el || !showFollowUpInput) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`
  }, [showFollowUpInput, followUpText])

  const handleSubmitFollowUp = useCallback(() => {
    const text = followUpText.trim()
    if (!text || !onAddFollowUp) return
    const meta = respondingToAiQuestion ? { respondingToAiQuestion } : undefined
    onAddFollowUp(thought.id, text, meta)
    setFollowUpText('')
    setRespondingToAiQuestion(null)
    setShowFollowUpInput(false)
  }, [followUpText, respondingToAiQuestion, onAddFollowUp, thought.id])

  const handleAiQuestionClick = useCallback(() => {
    if (!aiQuestion) return
    setRespondingToAiQuestion(aiQuestion)
    setShowFollowUpInput(true)
    setTimeout(() => followUpInputRef.current?.focus(), 80)
  }, [aiQuestion])

  const handleFollowUpChange = useCallback((e) => {
    const next = e.target.value
    setFollowUpText(next)
    setRespondingToAiQuestion((prev) => (prev !== null && !next.trim() ? null : prev))
  }, [])

  const handleFollowUpKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmitFollowUp()
      }
      if (e.key === 'Escape') {
        setShowFollowUpInput(false)
        setFollowUpText('')
        setRespondingToAiQuestion(null)
      }
    },
    [handleSubmitFollowUp]
  )

  const handleReflectClick = useCallback(async () => {
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
  }, [thought.cleaned_text, thought.content, thought.follow_ups, thought.followUps])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [displayText])

  const handleDelete = useCallback(() => {
    setShowMenu(false)
    onDelete(thought.id)
  }, [onDelete, thought.id])

  const handleTranslate = useCallback(async () => {
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
  }, [translationEnabled, isTranslated, originalText, translationLanguage])

  const handleEditStart = useCallback(() => {
    setShowMenu(false)
    setEditedRawText(displayText)
    setIsEditingCard(true)
  }, [displayText])

  const handleSaveEdit = useCallback(async () => {
    const text = editedRawText.trim()
    if (!text || !onDistillStateChange) return
    setIsSavingEdit(true)
    try {
      distill.applyEditAsDistill(text, displayText)
      setIsEditingCard(false)
      setEditedRawText('')
    } catch (err) {
      console.error('Failed to save edit:', err)
    } finally {
      setIsSavingEdit(false)
    }
  }, [editedRawText, displayText, onDistillStateChange, distill])

  const handleCancelEdit = useCallback(() => {
    if (isSavingEdit) return
    setIsEditingCard(false)
    setEditedRawText('')
  }, [isSavingEdit])

  const handleEditedRawTextChange = useCallback((e) => setEditedRawText(e.target.value), [])

  const handleFollowUpStartEdit = useCallback((index, initialText) => {
    setEditingFollowUpIndex(index)
    setEditingFollowUpDraft(initialText)
    setTimeout(() => editFollowUpTextareaRef.current?.focus(), 50)
  }, [])

  const handleFollowUpSaveEdit = useCallback(
    (index) => {
      if (!onEditFollowUp) return
      onEditFollowUp(thought.id, index, editingFollowUpDraft.trim())
      setEditingFollowUpIndex(null)
      setEditingFollowUpDraft('')
    },
    [onEditFollowUp, thought.id, editingFollowUpDraft]
  )

  const handleFollowUpCancelEdit = useCallback(() => {
    setEditingFollowUpIndex(null)
    setEditingFollowUpDraft('')
  }, [])

  const handleFollowUpDraftChange = useCallback((value) => setEditingFollowUpDraft(value), [])

  const followUpsList = thought.follow_ups ?? thought.followUps ?? []

  return (
    <Card
      className={`${cardBaseClass} ${isEditingCard ? 'pb-6' : 'pb-14'}`}
      style={card}
    >
      {isSavingEdit && <SavingOverlay />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-serif" style={mutedFg}>
          <span className="tracking-wide">{timestamp}</span>
          {duration && (
            <>
              <span className="w-px h-3 bg-stroke" style={stroke} />
              <span className="tracking-wide">{duration}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditingCard && (
            <DistillUndoControls
              distillationLevel={distill.distillationLevel}
              distillationStack={distill.distillationStack}
              distillationForwardStack={distill.distillationForwardStack}
              onRestoreDistill={distill.handleRestoreDistill}
              onRedoDistill={distill.handleRedoDistill}
            />
          )}
          <CardMenu
            menuRef={menuRef}
            isOpen={showMenu}
            onToggle={setShowMenu}
            canEdit={Boolean(onDistillStateChange)}
            displayText={displayText}
            onEditClick={handleEditStart}
            onDeleteClick={handleDelete}
          />
        </div>
      </div>

      <AiQuestionButton question={aiQuestion} onClick={handleAiQuestionClick} />

      <RespondingToBubble respondingTo={thought.responding_to} />

      {isEditingCard ? (
        <EditModeBlock
          value={editedRawText}
          onChange={handleEditedRawTextChange}
          onInput={resizeEditTextarea}
          disabled={isSavingEdit}
          textareaRef={editTextareaRef}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          isSaving={isSavingEdit}
        />
      ) : (
        <div className="min-w-0" style={{ paddingLeft: 0, marginLeft: 0 }}>
          <p className="text-sm sm:text-base leading-relaxed font-serif text-ink text-pretty mb-4" style={{ color: 'var(--ink)' }}>
            {renderBodyWithUnderlines(displayText, thought, onMentionClick)}
          </p>

          <TagRow
            thought={thought}
            suggestedTags={suggestedTags}
            activeTags={activeTags}
            onTagClick={onTagClick}
            onConfirmSuggestedTag={onConfirmSuggestedTag}
          />

          <PeopleMetadataRow thought={thought} linkedPeople={linkedPeople} onPersonClick={onPersonClick} onMentionClick={onMentionClick} />

          <ClarifierBannerPerson
            thoughtId={thought.id}
            clarifierForThoughtId={clarifierForThoughtId}
            clarifierForPersonId={clarifierForPersonId}
            linkedPeople={linkedPeople}
            onClarifierSubmit={onClarifierSubmit}
            onClarifierDismiss={onClarifierDismiss}
          />
          <ClarifierBannerNewPerson
            thoughtId={thought.id}
            clarifierForNewPerson={clarifierForNewPerson}
            onNewPersonClarifierComplete={onNewPersonClarifierComplete}
          />
          <ConfirmationBanners
            thoughtId={thought.id}
            confirmationList={confirmationList}
            onConfirmationChoose={onConfirmationChoose}
          />
          <DisambiguationBanners
            thoughtId={thought.id}
            disambiguationList={disambiguationList}
            onDisambiguationChoose={onDisambiguationChoose}
          />

          <FollowUpList
            followUps={followUpsList}
            thoughtId={thought.id}
            editingIndex={editingFollowUpIndex}
            editingDraft={editingFollowUpDraft}
            onEditingDraftChange={handleFollowUpDraftChange}
            onStartEdit={onEditFollowUp ? handleFollowUpStartEdit : undefined}
            onSaveEdit={handleFollowUpSaveEdit}
            onCancelEdit={handleFollowUpCancelEdit}
            onDeleteFollowUp={onDeleteFollowUp}
            editTextareaRef={editFollowUpTextareaRef}
          />

          {!isEditingCard && onAddFollowUp && showFollowUpInput && (
            <FollowUpInput
              value={followUpText}
              onChange={handleFollowUpChange}
              onSubmit={handleSubmitFollowUp}
              onKeyDown={handleFollowUpKeyDown}
              inputRef={followUpInputRef}
              respondingToAiQuestion={respondingToAiQuestion}
            />
          )}
        </div>
      )}

      <ActionBar
        isEditingCard={isEditingCard}
        showFollowUpInput={showFollowUpInput}
        onAddFollowUp={onAddFollowUp}
        onShowFollowUpInput={() => setShowFollowUpInput(true)}
        onReflectClick={handleReflectClick}
        isLoadingReflect={isLoadingReflect}
        onDistillClick={distill.handleDistillClick}
        isDistilling={distill.isDistilling}
        distillationLevel={distill.distillationLevel}
        translationEnabled={translationEnabled}
        isTranslated={isTranslated}
        isTranslating={isTranslating}
        onTranslate={handleTranslate}
        onCopy={handleCopy}
      />

      {copied && <CopyToast />}
    </Card>
  )
}

export const ThoughtCard = memo(ThoughtCardInner)
