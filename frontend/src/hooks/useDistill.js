import { useState, useEffect, useCallback } from 'react'
import { distillText, rewriteText } from '../services/api'

function getDistilledFromThought(t) {
  return (t?.distilled_text ?? t?.distilledText) ?? null
}

function getHistoryFromThought(t) {
  return Array.isArray(t?.distill_history)
    ? t.distill_history
    : Array.isArray(t?.distillHistory)
      ? t.distillHistory
      : []
}

/**
 * Encapsulates distillation state and undo/redo for a thought.
 * Returns display text, level, and handlers; syncs from thought.id when it changes.
 * @param {Function} [onDistillError] - Called with error message string when distill API fails (e.g. for toast).
 */
export function useDistill(thought, baseDisplayText, onDistillStateChange, onDistillError) {
  const [distillationLevel, setDistillationLevel] = useState(() => {
    const raw = getDistilledFromThought(thought)
    const hasDistilled = raw != null && String(raw).trim() !== ''
    const history = getHistoryFromThought(thought)
    return hasDistilled ? history.length : 0
  })
  const [distilledText, setDistilledText] = useState(() => {
    const raw = getDistilledFromThought(thought)
    const hasDistilled = raw != null && String(raw).trim() !== ''
    return hasDistilled ? raw : null
  })
  const [distillationStack, setDistillationStack] = useState(() => getHistoryFromThought(thought))
  const [distillationForwardStack, setDistillationForwardStack] = useState([])
  const [isDistilling, setIsDistilling] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)

  useEffect(() => {
    const raw = getDistilledFromThought(thought)
    const hasDistilled = raw != null && String(raw).trim() !== ''
    const history = getHistoryFromThought(thought)
    setDistillationLevel(hasDistilled ? history.length : 0)
    setDistilledText(hasDistilled ? raw : null)
    setDistillationStack(history)
    setDistillationForwardStack([])
  }, [thought.id])

  const currentDisplayForDistill =
    distillationLevel > 0 && distilledText ? distilledText : baseDisplayText

  const handleDistillClick = useCallback(async () => {
    if (isDistilling || isRewriting) return
    if (!currentDisplayForDistill?.trim()) return
    setIsDistilling(true)
    setDistillationForwardStack([])
    try {
      const newStack = [...distillationStack, currentDisplayForDistill]
      setDistillationStack(newStack)
      const next = await distillText(currentDisplayForDistill, distillationLevel + 1)
      const nextText = (next || '').trim() || currentDisplayForDistill
      setDistilledText(nextText)
      setDistillationLevel((l) => l + 1)
      onDistillStateChange?.(thought.id, { distilled_text: nextText, distill_history: newStack })
    } catch (err) {
      console.error('Distill failed:', err)
      setDistillationStack((s) => (s.length > 0 ? s.slice(0, -1) : []))
      onDistillError?.(err?.message || 'Distill failed. Check Settings and backend config.')
    } finally {
      setIsDistilling(false)
    }
  }, [
    thought.id,
    isDistilling,
    isRewriting,
    currentDisplayForDistill,
    distillationStack,
    distillationLevel,
    onDistillStateChange,
    onDistillError,
  ])

  const handleRewriteClick = useCallback(async () => {
    if (isDistilling || isRewriting) return
    if (!currentDisplayForDistill?.trim()) return
    setIsRewriting(true)
    setDistillationForwardStack([])
    try {
      const newStack = [...distillationStack, currentDisplayForDistill]
      setDistillationStack(newStack)
      const next = await rewriteText(currentDisplayForDistill)
      const nextText = (next || '').trim() || currentDisplayForDistill
      setDistilledText(nextText)
      setDistillationLevel((l) => l + 1)
      onDistillStateChange?.(thought.id, { distilled_text: nextText, distill_history: newStack })
    } catch (err) {
      console.error('Rewrite failed:', err)
      setDistillationStack((s) => (s.length > 0 ? s.slice(0, -1) : []))
      onDistillError?.(err?.message || 'Rewrite failed. Check Settings and backend config.')
    } finally {
      setIsRewriting(false)
    }
  }, [
    thought.id,
    isDistilling,
    isRewriting,
    currentDisplayForDistill,
    distillationStack,
    onDistillStateChange,
    onDistillError,
  ])

  const handleRestoreDistill = useCallback(() => {
    if (distillationLevel === 0 || distillationStack.length === 0) return
    const currentDisplay = distillationLevel > 0 && distilledText ? distilledText : baseDisplayText
    setDistillationForwardStack((fwd) => [...fwd, currentDisplay])
    const prev = distillationStack[distillationStack.length - 1]
    const nextStack = distillationStack.slice(0, -1)
    const newLevel = distillationLevel - 1
    setDistillationStack(nextStack)
    setDistillationLevel(newLevel)
    setDistilledText(newLevel === 0 ? null : prev)
    onDistillStateChange?.(thought.id, {
      distilled_text: newLevel === 0 ? null : prev,
      distill_history: newLevel === 0 ? [] : nextStack,
    })
  }, [
    thought.id,
    distillationLevel,
    distillationStack,
    distilledText,
    baseDisplayText,
    onDistillStateChange,
  ])

  const handleRedoDistill = useCallback(() => {
    if (distillationForwardStack.length === 0) return
    const currentDisplay = distillationLevel > 0 && distilledText ? distilledText : baseDisplayText
    const newStack = [...distillationStack, currentDisplay]
    const next = distillationForwardStack[distillationForwardStack.length - 1]
    const nextFwd = distillationForwardStack.slice(0, -1)
    setDistillationStack(newStack)
    setDistillationForwardStack(nextFwd)
    setDistillationLevel((l) => l + 1)
    setDistilledText(next)
    onDistillStateChange?.(thought.id, { distilled_text: next, distill_history: newStack })
  }, [
    thought.id,
    distillationLevel,
    distilledText,
    baseDisplayText,
    distillationStack,
    distillationForwardStack,
    onDistillStateChange,
  ])

  /** Call when user saves an edit: push currentDisplay (what was shown before edit) onto history and set new distilled text. */
  const applyEditAsDistill = useCallback(
    (newText, currentDisplayToPush) => {
      const newStack = [...distillationStack, currentDisplayToPush]
      setDistillationStack(newStack)
      setDistilledText(newText)
      setDistillationLevel((l) => l + 1)
      setDistillationForwardStack([])
      onDistillStateChange?.(thought.id, { distilled_text: newText, distill_history: newStack })
    },
    [thought.id, distillationStack, onDistillStateChange]
  )

  const displayFromState =
    distillationLevel > 0 && distilledText != null && distilledText !== '' ? distilledText : null

  return {
    distillationLevel,
    distilledText,
    distillationStack,
    distillationForwardStack,
    isDistilling,
    isRewriting,
    setDistillationStack,
    setDistilledText,
    setDistillationLevel,
    setDistillationForwardStack,
    displayFromState,
    handleDistillClick,
    handleRewriteClick,
    handleRestoreDistill,
    handleRedoDistill,
    applyEditAsDistill,
  }
}

export { getDistilledFromThought, getHistoryFromThought }
