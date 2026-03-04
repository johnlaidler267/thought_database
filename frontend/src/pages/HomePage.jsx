import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import Tooltip from '../components/ui/Tooltip'
import ConfirmDialog from '../components/ConfirmDialog'
import { Mic, Pause, Keyboard } from 'lucide-react'
import { TbPencilQuestion } from 'react-icons/tb'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useThoughts } from '../hooks/useThoughts'
import { useCategories } from '../hooks/useCategories'
import { usePeopleLink } from '../hooks/usePeopleLink'
import { supabase } from '../services/supabase'
import { transcribeAudio, warmApiConnection, extractTags, syncBlurbForThought } from '../services/api'
import { estimateTranscriptionTokens, estimateTokens } from '../utils/tokenEstimator'
import { FREE_TIER_TOKEN_LIMIT } from '../constants'
import { hasRecoveryFlag, clearRecoveryFlag, getPendingRecording, clearPendingRecording } from '../utils/recordingRecovery'
import { ThoughtCard } from '../components/ThoughtCard'
import { ThoughtStartersFlow } from '../components/ThoughtStartersFlow'
import { TranscriptEditor } from '../components/TranscriptEditor'
import PersonProfilePanel from '../components/PersonProfilePanel'
import { HomePageHeader } from './HomePage/HomePageHeader'
import { SearchBar } from './HomePage/SearchBar'
import { CategoryTabs } from './HomePage/CategoryTabs'
import { pageBackground, errorBannerStyle, loadingBannerStyle, transcriptEditorOverlay, recordBarGradient, remainingTimeBadge } from './HomePage/styles'

export default function HomePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const { thoughts, setThoughts, thoughtPeople, setThoughtPeople, peopleMap, setPeopleMap } =
    useThoughts(user)
  const categoriesState = useCategories(user?.id)
  const {
    categories,
    setCategories,
    activeCategory,
    setActiveCategory,
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    categoryToDelete,
    handleAddCategory,
    handleDeleteCategory,
    confirmDeleteCategory,
    cancelDeleteCategory,
  } = categoriesState

  const keyPointsByThoughtIdRef = useRef({})
  const onSyncBlurb = useCallback(
    (thoughtId) => {
      const kp = keyPointsByThoughtIdRef.current[thoughtId]
      if (kp && user?.id) syncBlurbForThought(thoughtId, user.id, kp)
    },
    [user?.id]
  )
  const peopleLink = usePeopleLink(user, thoughtPeople, peopleMap, setThoughtPeople, setPeopleMap, onSyncBlurb)
  const {
    linkedPeopleByThoughtId,
    openPersonId,
    setOpenPersonId,
    clarifierForPersonId,
    clarifierForThoughtId,
    disambiguationPending,
    setDisambiguationPending,
    confirmationPending,
    setConfirmationPending,
    clarifierForNewPerson,
    setClarifierForPersonId,
    setClarifierForThoughtId,
    resolveMentionsToPeople,
    handleClarifierSubmit,
    handleClarifierDismiss,
    handleConfirmationChoose,
    handleNewPersonClarifierComplete,
    handleDisambiguationChoose,
    handlePersonClick,
    handleMentionClick,
    handleClosePersonPanel,
    handleUnlinkThoughtPerson,
    handleEditClarifier,
    handleScrollToThought,
  } = peopleLink

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sortOrder, setSortOrder] = useState('desc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef(null)
  const [thoughtToDelete, setThoughtToDelete] = useState(null)
  const [followUpToDelete, setFollowUpToDelete] = useState(null)
  const [suggestedTagsByThoughtId, setSuggestedTagsByThoughtId] = useState({})
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [showAiPrompts, setShowAiPrompts] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const [initialTranscriptForEditor, setInitialTranscriptForEditor] = useState('')
  const skipPersistRef = useRef(false)
  const resolveMentionsToPeopleRef = useRef(null)
  const isFromRecordingRef = useRef(false)
  const aiPromptsRecordRef = useRef(null)
  const aiPromptsEditorRef = useRef(null)
  const thoughtsRef = useRef(thoughts)

  useEffect(() => {
    thoughtsRef.current = thoughts
  }, [thoughts])

  const { 
    isRecording: isAudioRecording, 
    error: recordingError, 
    remainingTime,
    showWarning,
    audioLevels,
    formatRemainingTime,
    startRecording, 
    stopRecording,
    setOnAutoStop
  } = useAudioRecorder()

  // Redirect to welcome screen if not authenticated
  // Only redirect after auth loading is complete and user is confirmed to be null
  useEffect(() => {
    // Don't redirect while loading
    if (authLoading) return
    
    // Don't redirect if we're already on welcome page (prevents loops)
    if (location.pathname === '/welcome') return
    
    // Only redirect if user is definitely null (not just undefined during initial load)
    if (!user) {
      navigate('/welcome', { replace: true })
    }
  }, [user, authLoading, navigate, location.pathname])

  // Warm backend connection on mount so first transcription isn't slowed (helps mobile / cold start)
  useEffect(() => {
    if (user) warmApiConnection()
  }, [user?.id])

  const handleRecordStart = () => {
    // Free tier: block starting a recording if already at token limit
    if (profile?.tier === 'trial' && (profile?.tokens_used || 0) >= FREE_TIER_TOKEN_LIMIT) {
      alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
      return
    }
    // Warm backend now so transcribe request hits a warm server (avoids 20s+ first-request delay on mobile)
    warmApiConnection()
    setIsRecording(true)
    isFromRecordingRef.current = true // Mark that this will be from recording
    startRecording()
  }

  // Treat API silence placeholders (e.g. "Thank you") as no speech — auto-close, no editor
  const isSilencePlaceholder = useCallback((text) => {
    const t = (text || '').trim().toLowerCase().replace(/\.$/, '')
    if (!t) return true
    const placeholders = ['thank you', 'thanks for watching', 'thanks for listening', 'bye', 'goodbye']
    return placeholders.includes(t)
  }, [])

  // Shared function to process audio blob (used by both manual stop and auto-stop)
  const processAudioBlob = useCallback(async (audioBlob, isAutoStop = false) => {
    try {
      setIsRecording(false)
      setLoading(true)

      if (!audioBlob || audioBlob.size === 0) {
        setLoading(false)
        return
      }

      // Free tier: block before calling Whisper so we don't consume transcription
      if (profile?.tier === 'trial' && (profile?.tokens_used || 0) >= FREE_TIER_TOKEN_LIMIT) {
        setLoading(false)
        alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
        return
      }

      // Transcribe
      let transcript
      try {
        const result = await transcribeAudio(audioBlob)
        transcript = result.transcript
      } catch (err) {
        console.error('Transcription error:', err)
        const errorMessage = err.message || 'Failed to transcribe audio'
        throw new Error(`Transcription failed: ${errorMessage}. Please ensure your backend is running.`)
      }

      const trimmed = (transcript || '').trim()
      if (!trimmed || isSilencePlaceholder(trimmed)) {
        setLoading(false)
        return
      }

      // Show transcript in editor (TranscriptEditor owns draft state and focuses itself)
      skipPersistRef.current = false
      setInitialTranscriptForEditor(transcript)
      setEditorSessionKey((k) => k + 1)
      setShowAiPrompts(false)
      setIsEditingTranscript(true)
      isFromRecordingRef.current = true // Mark that this came from recording
      setLoading(false)

      // Charge for Whisper in the background so we don't block the UI (profile update can be slow for new accounts)
      if ((profile?.tier === 'apprentice' || profile?.tier === 'trial') && supabase && user) {
        const transcriptionTokens = estimateTranscriptionTokens(transcript) + estimateTokens(transcript)
        if (transcriptionTokens > 0) {
          const newTokensUsed = (profile.tokens_used || 0) + transcriptionTokens
          supabase
            .from('profiles')
            .update({ tokens_used: newTokensUsed })
            .eq('id', user.id)
            .then(({ error: updateError }) => {
              if (!updateError) refreshProfile().catch((e) => console.warn('Failed to refresh profile:', e))
            })
            .catch((e) => console.warn('Error charging transcription usage:', e))
        }
      }
      
      // Show notification if auto-stopped
      if (isAutoStop) {
        alert('Recording stopped at 5 minute limit. Your audio has been transcribed.')
      }
    } catch (err) {
      console.error('Error processing recording:', err)
      const errorMessage = err.message || 'Failed to process recording. Please try again.'
      alert(errorMessage)
      setLoading(false)
    }
  }, [profile?.tier, profile?.tokens_used, user, supabase, refreshProfile, isSilencePlaceholder])

  const handleRecordStop = async () => {
    const audioBlob = await stopRecording()
    await processAudioBlob(audioBlob, false)
  }

  // Set up auto-stop callback
  useEffect(() => {
    const handleAutoStop = async (audioBlob) => {
      await processAudioBlob(audioBlob, true)
    }
    setOnAutoStop(handleAutoStop)
  }, [setOnAutoStop, processAudioBlob])

  // Recover recording after refresh: transcribe pending blob and open editor
  useEffect(() => {
    if (!user || !hasRecoveryFlag()) return
    let cancelled = false
    getPendingRecording()
      .then(async (pending) => {
        if (cancelled || !pending?.blob || pending.blob.size < 1000) {
          clearRecoveryFlag()
          await clearPendingRecording()
          return
        }
        clearRecoveryFlag()
        await clearPendingRecording()
        await processAudioBlob(pending.blob, false)
      })
      .catch(() => {
        clearRecoveryFlag()
        clearPendingRecording()
      })
    return () => { cancelled = true }
  }, [user, processAudioBlob])

  const handleSubmitTranscript = useCallback(async (editedTranscript) => {
    const trimmed = (editedTranscript || '').trim()
    if (!trimmed) return

    try {
      setLoading(true)

      // Save as-typed: no AI cleanup or tagging on submission
      const category = activeCategory !== 'All' ? activeCategory : null

      const newThought = {
        user_id: user?.id,
        raw_transcript: trimmed,
        cleaned_text: trimmed,
        tags: [],
        mentions: [],
        thought_type: null,
        category: category,
        responding_to: selectedPrompt || null,
        created_at: new Date().toISOString(),
      }

      if (supabase && user) {
        try {
          // Verify session before inserting
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session) {
            console.error('No valid session when saving thought:', sessionError)
            throw new Error('Session expired. Please log in again.')
          }
          
          console.log('Saving thought to Supabase with user_id:', user.id)

          // Try full insert first so mentions/category/responding_to persist when columns exist
          let result = await supabase
            .from('thoughts')
            .insert([newThought])
            .select()
            .single()

          let data = result.data
          let error = result.error

          // If any optional column is missing, retry with core columns only then PATCH optional
          if (error?.code === 'PGRST204') {
            const corePayload = {
              user_id: newThought.user_id,
              raw_transcript: newThought.raw_transcript,
              cleaned_text: newThought.cleaned_text,
              tags: newThought.tags,
              created_at: newThought.created_at,
            }
            result = await supabase
              .from('thoughts')
              .insert([corePayload])
              .select()
              .single()
            data = result.data
            error = result.error
            if (data) {
              data = { ...data, category: newThought.category, responding_to: newThought.responding_to, mentions: newThought.mentions, thought_type: newThought.thought_type }
              const optional = {}
              if (newThought.category != null) optional.category = newThought.category
              if (newThought.responding_to != null) optional.responding_to = newThought.responding_to
              if (newThought.mentions != null && newThought.mentions.length > 0) optional.mentions = newThought.mentions
              if (newThought.thought_type != null) optional.thought_type = newThought.thought_type
              if (Object.keys(optional).length > 0) {
                await supabase.from('thoughts').update(optional).eq('id', data.id)
              }
            }
          } else if (data) {
            data = { ...data, category: newThought.category, responding_to: newThought.responding_to, mentions: newThought.mentions, thought_type: newThought.thought_type }
          }

          if (error) {
            console.error('Supabase insert error:', error)
            throw error
          }
          
          console.log('Thought saved successfully:', data)
          setThoughts(prev => [data, ...prev])

          // Suggest tags and extract mentions/thought_type in background; update thought when result returns
          const vocabulary = [...new Set(thoughts.flatMap((t) => t.tags || []).filter(Boolean))]
          extractTags(trimmed, vocabulary)
            .then((result) => {
              const suggested = Array.isArray(result?.tags) ? result.tags : []
              const mentions = Array.isArray(result?.mentions) ? result.mentions : []
              const key_points = typeof result?.key_points === 'object' ? result.key_points : {}
              const thought_type = result?.thought_type ?? null
              const dataIdStr = String(data.id)
              if (Object.keys(key_points).length > 0) {
                keyPointsByThoughtIdRef.current[dataIdStr] = key_points
              }
              if (suggested.length > 0) {
                setSuggestedTagsByThoughtId((prev) => ({ ...prev, [data.id]: suggested }))
              }
              if (mentions.length > 0 || thought_type) {
                setThoughts((prev) =>
                  prev.map((t) =>
                    String(t.id) === dataIdStr
                      ? { ...t, mentions: mentions.length > 0 ? mentions : t.mentions, thought_type: thought_type || t.thought_type }
                      : t
                  )
                )
                const payload = {}
                if (mentions.length > 0) payload.mentions = mentions
                if (thought_type) payload.thought_type = thought_type
                if (Object.keys(payload).length > 0) {
                  supabase
                    .from('thoughts')
                    .update(payload)
                    .eq('id', dataIdStr)
                    .eq('user_id', user.id)
                    .then(({ error }) => { if (error) console.error('Failed to save mentions/thought_type:', error) })
                }
                if (mentions.length > 0 && supabase && user) {
                  resolveMentionsToPeopleRef.current?.(mentions, dataIdStr, user.id).then(({ newPersonIds, newThoughtPeople, newPeopleMap, disambiguationPending: pending, confirmationPending: confirmPending }) => {
                    if (newThoughtPeople.length) setThoughtPeople((prev) => [...prev, ...newThoughtPeople])
                    if (Object.keys(newPeopleMap).length) setPeopleMap((prev) => ({ ...prev, ...newPeopleMap }))
                    if (newPersonIds.length > 0) {
                      setClarifierForPersonId(newPersonIds[0])
                      setClarifierForThoughtId(dataIdStr)
                    }
                    if (pending && pending.length > 0) {
                      setDisambiguationPending((prev) => [...prev, ...pending])
                    }
                    if (confirmPending && confirmPending.length > 0) {
                      setConfirmationPending((prev) => [...prev, ...confirmPending])
                    }
                    const hasValidKeyPoints = Object.values(key_points).some((v) =>
                      Array.isArray(v) ? v.some((p) => p && String(p).trim()) : (v && String(v).trim())
                    )
                    if (hasValidKeyPoints) {
                      syncBlurbForThought(dataIdStr, user.id, key_points)
                    } else if (mentions.length > 0) {
                      const fallback = mentions.reduce((acc, name) => {
                        acc[name] = trimmed.slice(0, 200).trim() || 'Mentioned in thought'
                        return acc
                      }, {})
                      syncBlurbForThought(dataIdStr, user.id, fallback)
                    }
                  }).catch((err) => console.error('Resolve mentions to people:', err))
                }
              }
            })
            .catch(() => {})

          // Reset recording flag
          isFromRecordingRef.current = false
        } catch (err) {
          console.error('Failed to save to Supabase:', err)
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
            status: err.status
          })
          const mockThought = {
            ...newThought,
            id: Date.now().toString(),
          }
          setThoughts(prev => [mockThought, ...prev])
          throw new Error('Saved locally, but failed to sync to cloud.')
        }
      } else {
        // Dev mode - save locally
        const mockThought = {
          ...newThought,
          id: Date.now().toString(),
        }
        setThoughts(prev => [mockThought, ...prev])
      }

      // Close editor without persisting draft (TranscriptEditor checks skipPersistRef on unmount)
      skipPersistRef.current = true
      try { sessionStorage.removeItem('vellum_draft_pending') } catch {}
      setSelectedPrompt(null)
      setIsEditingTranscript(false)
      isFromRecordingRef.current = false
    } catch (err) {
      console.error('Error saving thought:', err)
      const errorMessage = err.message || 'Failed to save thought. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, selectedPrompt, user, supabase, setThoughts, thoughts, setSuggestedTagsByThoughtId, setThoughtPeople, setPeopleMap, setClarifierForPersonId, setClarifierForThoughtId, setDisambiguationPending, setConfirmationPending])

  const handleCancelEdit = () => {
    setSelectedPrompt(null)
    setIsEditingTranscript(false)
  }

  const handleRecordClick = () => {
    if (isAudioRecording) {
      handleRecordStop()
    } else {
      handleRecordStart()
    }
  }

  const handleProfileClick = () => {
    navigate('/settings')
  }

  const handleKeyboardToggle = () => {
    // Free tier: block opening editor if at token limit
    if (profile?.tier === 'trial' && (profile?.tokens_used || 0) >= FREE_TIER_TOKEN_LIMIT) {
      alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
      return
    }
    skipPersistRef.current = false
    setInitialTranscriptForEditor('')
    setEditorSessionKey((k) => k + 1)
    setShowAiPrompts(false)
    setIsEditingTranscript(true)
    isFromRecordingRef.current = false // Mark as typed, not recorded
  }

  // Restore draft transcript when returning from another page (e.g. Settings)
  useEffect(() => {
    if (!user) return
    try {
      const saved = sessionStorage.getItem('vellum_draft_pending')
      if (!saved) return
      const { transcript } = JSON.parse(saved)
      if (typeof transcript === 'string' && transcript.trim() !== '') {
        setInitialTranscriptForEditor(transcript)
        setEditorSessionKey((k) => k + 1)
        setShowAiPrompts(false)
        setIsEditingTranscript(true)
      }
      sessionStorage.removeItem('vellum_draft_pending')
    } catch {
      sessionStorage.removeItem('vellum_draft_pending')
    }
  }, [user?.id])

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false)
      }
    }
    if (sortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sortMenuOpen])

  // Close Thought Starters menu when clicking outside (record bar or editor popover)
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inRecord = aiPromptsRecordRef.current?.contains(e.target)
      const inEditor = aiPromptsEditorRef.current?.contains(e.target)
      if (!inRecord && !inEditor) setShowAiPrompts(false)
    }
    if (showAiPrompts) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAiPrompts])

  const openAiPromptsFromCard = useCallback(() => setShowAiPrompts(true), [])

  // When user picks Record from thought starters: set prompt, dismiss, start recording
  const handleRecordWithPrompt = useCallback(
    (prompt) => {
      setSelectedPrompt(prompt)
      setShowAiPrompts(false)
      if (profile?.tier === 'trial' && (profile?.tokens_used || 0) >= FREE_TIER_TOKEN_LIMIT) {
        alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
        return
      }
      warmApiConnection()
      setIsRecording(true)
      isFromRecordingRef.current = true
      startRecording()
    },
    [profile?.tier, profile?.tokens_used, startRecording]
  )

  // When user picks Type from thought starters: set prompt, dismiss, open transcript editor
  const handleTypeWithPrompt = useCallback(
    (prompt) => {
      if (profile?.tier === 'trial' && (profile?.tokens_used || 0) >= FREE_TIER_TOKEN_LIMIT) {
        alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
        return
      }
      setSelectedPrompt(prompt)
      setShowAiPrompts(false)
      skipPersistRef.current = false
      setInitialTranscriptForEditor('')
      setEditorSessionKey((k) => k + 1)
      setIsEditingTranscript(true)
      isFromRecordingRef.current = false
    },
    [profile?.tier, profile?.tokens_used]
  )

  const handleDeleteThought = useCallback((thoughtId) => {
    setThoughtToDelete(thoughtId)
  }, [])

  const confirmDeleteThought = async () => {
    if (!thoughtToDelete) return

    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('thoughts')
          .delete()
          .eq('id', thoughtToDelete)
          .eq('user_id', user.id)

        if (error) throw error
      } catch (err) {
        console.error('Failed to delete from Supabase:', err)
      }
    }

    setThoughts(prev => prev.filter(thought => thought.id !== thoughtToDelete))
    setSuggestedTagsByThoughtId((prev) => {
      const next = { ...prev }
      delete next[thoughtToDelete]
      return next
    })
    setThoughtToDelete(null)
  }

  const cancelDeleteThought = () => {
    setThoughtToDelete(null)
  }

  const handleConfirmSuggestedTag = useCallback(async (thoughtId, tag) => {
    if (!tag?.trim() || thoughtId == null) return
    const idStr = String(thoughtId)
    const currentThoughts = thoughtsRef.current
    const thought = currentThoughts.find((t) => String(t.id) === idStr)
    if (!thought) return
    const existingTags = Array.isArray(thought.tags) ? thought.tags : []
    if (existingTags.some((t) => String(t).toLowerCase() === String(tag).toLowerCase())) return
    const newTags = [...existingTags, tag.trim()]

    setThoughts((prev) =>
      prev.map((t) => (String(t.id) === idStr ? { ...t, tags: newTags } : t))
    )
    setSuggestedTagsByThoughtId((prev) => {
      const list = prev[thoughtId] || []
      const next = list.filter((t) => String(t).toLowerCase() !== String(tag).toLowerCase())
      const nextState = { ...prev, [thoughtId]: next }
      if (next.length === 0) delete nextState[thoughtId]
      return nextState
    })

    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('thoughts')
          .update({ tags: newTags })
          .eq('id', idStr)
          .eq('user_id', user.id)
        if (error) throw error
      } catch (err) {
        console.error('Failed to save tag:', err)
      }
    }
  }, [user])

  const handleAddFollowUp = useCallback(async (thoughtId, text, meta) => {
    if (!text?.trim() || !user) return
    let newFollowUps
    const respondingToAi = meta?.respondingToAiQuestion ?? null
    setThoughts((prev) => {
      const thought = prev.find((t) => t.id === thoughtId)
      const existing = Array.isArray(thought?.follow_ups) ? thought.follow_ups : []
      const newEntry = {
        text: text.trim(),
        created_at: new Date().toISOString(),
        ...(respondingToAi ? { responding_to_ai: respondingToAi } : {})
      }
      newFollowUps = [...existing, newEntry]
      return prev.map((t) => (t.id === thoughtId ? { ...t, follow_ups: newFollowUps } : t))
    })

    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('thoughts')
          .update({ follow_ups: newFollowUps })
          .eq('id', thoughtId)
          .eq('user_id', user.id)
        if (error) throw error
      } catch (err) {
        console.error('Failed to save follow-up:', err)
        // Keep optimistic update so the follow-up stays visible; ensure migration is run for persistence
      }
    }
  }, [user])

  const handleDeleteFollowUp = useCallback((thoughtId, index) => {
    setFollowUpToDelete({ thoughtId, index })
  }, [])

  const confirmDeleteFollowUp = useCallback(async () => {
    if (!followUpToDelete || !user) return
    const { thoughtId, index } = followUpToDelete
    let newFollowUps
    setThoughts((prev) => {
      const thought = prev.find((t) => t.id === thoughtId)
      const existing = Array.isArray(thought?.follow_ups) ? thought.follow_ups : []
      newFollowUps = existing.filter((_, i) => i !== index)
      return prev.map((t) => (t.id === thoughtId ? { ...t, follow_ups: newFollowUps } : t))
    })
    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('thoughts')
          .update({ follow_ups: newFollowUps })
          .eq('id', thoughtId)
          .eq('user_id', user.id)
        if (error) throw error
      } catch (err) {
        console.error('Failed to delete follow-up:', err)
      }
    }
    setFollowUpToDelete(null)
  }, [followUpToDelete, user])

  const cancelDeleteFollowUp = useCallback(() => {
    setFollowUpToDelete(null)
  }, [])

  const handleEditFollowUp = useCallback(async (thoughtId, index, newText) => {
    if (newText == null || !user) return
    const trimmed = typeof newText === 'string' ? newText.trim() : ''
    let newFollowUps
    setThoughts((prev) => {
      const thought = prev.find((t) => t.id === thoughtId)
      const existing = Array.isArray(thought?.follow_ups) ? thought.follow_ups : []
      const entry = existing[index]
      const updated = existing.map((e, i) =>
        i !== index ? e : { ...(typeof e === 'object' && e ? e : { text: e }), text: trimmed }
      )
      newFollowUps = updated
      return prev.map((t) => (t.id === thoughtId ? { ...t, follow_ups: newFollowUps } : t))
    })
    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('thoughts')
          .update({ follow_ups: newFollowUps })
          .eq('id', thoughtId)
          .eq('user_id', user.id)
        if (error) throw error
      } catch (err) {
        console.error('Failed to save follow-up edit:', err)
      }
    }
  }, [user])

  const handleReprocessThought = useCallback(async (thoughtId, newRawTranscript) => {
    if (!newRawTranscript?.trim() || !user) return

    const editedTranscript = newRawTranscript.trim()

    setThoughts((prev) =>
      prev.map((t) =>
        t.id === thoughtId
          ? {
              ...t,
              raw_transcript: editedTranscript,
              cleaned_text: editedTranscript,
              tags: [],
              mentions: [],
              thought_type: null,
            }
          : t
      )
    )

    if (supabase && user) {
      const { error } = await supabase
        .from('thoughts')
        .update({
          raw_transcript: editedTranscript,
          cleaned_text: editedTranscript,
          tags: [],
          mentions: [],
          thought_type: null,
        })
        .eq('id', thoughtId)
        .eq('user_id', user.id)
      if (error) throw error
    }
  }, [user])

  const handleDistillStateChange = useCallback((thoughtId, { distilled_text, distill_history }) => {
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === thoughtId
          ? { ...t, distilled_text: distilled_text ?? null, distill_history: Array.isArray(distill_history) ? distill_history : [] }
          : t
      )
    )
    if (supabase && user) {
      supabase
        .from('thoughts')
        .update({
          distilled_text: distilled_text ?? null,
          distill_history: Array.isArray(distill_history) ? distill_history : [],
        })
        .eq('id', thoughtId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Failed to persist distill state:', error)
        })
    }
  }, [user])

  const handleThoughtCategoriesChange = useCallback(
    async (thoughtId, nextCategories) => {
      const list = Array.isArray(nextCategories) ? nextCategories : []
      const primary = list[0] || null
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === thoughtId ? { ...t, categories: list, category: primary } : t
        )
      )
      setCategories((prev) => {
        const next = [...prev]
        let changed = false
        for (const name of list) {
          if (name && name !== 'All' && !prev.includes(name)) {
            next.push(name)
            changed = true
          }
        }
        return changed ? next : prev
      })
      if (supabase && user) {
        try {
          const payload = { category: primary }
          if (list.length) payload.categories = list
          const { error } = await supabase
            .from('thoughts')
            .update(payload)
            .eq('id', thoughtId)
            .eq('user_id', user.id)
          if (error && payload.categories) {
            await supabase
              .from('thoughts')
              .update({ category: primary })
              .eq('id', thoughtId)
              .eq('user_id', user.id)
          }
        } catch (err) {
          console.error('Failed to update thought categories:', err)
        }
      }
    },
    [user, setThoughts, setCategories, supabase]
  )

  // Toggle tag in active chips: add if not present, remove if present (case-insensitive)
  const handleTagClick = useCallback((tag) => {
    const normalized = tag.trim()
    if (!normalized) return
    setActiveTags((prev) => {
      const lower = normalized.toLowerCase()
      const idx = prev.findIndex((t) => t.toLowerCase() === lower)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      return [...prev, normalized]
    })
  }, [])

  // Filter thoughts: must match ALL active tags (AND) and the free-text query
  const filteredThoughts = useMemo(() => {
    return thoughts.filter((thought) => {
      if (activeCategory !== 'All') {
        const thoughtCats = thought.categories ?? (thought.category ? [thought.category] : [])
        const matches = Array.isArray(thoughtCats)
          ? thoughtCats.includes(activeCategory)
          : thought.category === activeCategory
        if (!matches) return false
      }
      // Entry must have every active tag (thought.tags contains each, case-insensitive)
      const thoughtTagLower = (thought.tags || []).map((t) => String(t).toLowerCase())
      for (const active of activeTags) {
        const a = active.trim().toLowerCase()
        if (!a) continue
        if (!thoughtTagLower.some((t) => t === a)) return false
      }
      // Free-text: match tag or content
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTag = thought.tags && thought.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        )
        const matchesCleanedText = thought.cleaned_text &&
          thought.cleaned_text.toLowerCase().includes(query)
        const matchesRawText = thought.raw_transcript &&
          thought.raw_transcript.toLowerCase().includes(query)
        if (!(matchesTag || matchesCleanedText || matchesRawText)) return false
      }
      return true
    })
  }, [thoughts, searchQuery, activeCategory, activeTags])

  const sortedThoughts = useMemo(() => {
    const list = [...filteredThoughts]
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return sortOrder === 'asc' ? ta - tb : tb - ta
    })
    return list
  }, [filteredThoughts, sortOrder])

  const openPersonThoughts = useMemo(() => {
    if (!openPersonId) return []
    const thoughtIds = thoughtPeople.filter((tp) => tp.person_id === openPersonId).map((tp) => tp.thought_id)
    return thoughts.filter((t) => thoughtIds.includes(t.id))
  }, [openPersonId, thoughtPeople, thoughts])

  const handleClearSearchAndTags = useCallback(() => {
    setSearchQuery('')
    setActiveTags([])
  }, [])

  const handleSortOrderChange = useCallback((order) => setSortOrder(order), [])
  const handleSortMenuToggle = useCallback((open) => setSortMenuOpen(open), [])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div style={{ color: 'var(--muted-foreground)' }}>Loading...</div>
      </div>
    )
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={pageBackground}>
      <HomePageHeader
        isDark={isDark}
        isAudioRecording={isAudioRecording}
        showWarning={showWarning}
        onProfileClick={handleProfileClick}
        user={user}
      />

      <SearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeTags={activeTags}
        onTagClick={handleTagClick}
        onClearSearchAndTags={handleClearSearchAndTags}
        sortMenuRef={sortMenuRef}
        sortOrder={sortOrder}
        sortMenuOpen={sortMenuOpen}
        onSortMenuToggle={handleSortMenuToggle}
        onSortOrderChange={handleSortOrderChange}
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onActiveCategoryChange={setActiveCategory}
        isAddingCategory={isAddingCategory}
        newCategoryName={newCategoryName}
        onNewCategoryNameChange={setNewCategoryName}
        onAddCategory={handleAddCategory}
        onStartAddCategory={() => setIsAddingCategory(true)}
        onCancelAddCategory={() => {
          setIsAddingCategory(false)
          setNewCategoryName('')
        }}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Timeline - extra bottom padding so card tags stay above the fixed record buttons */}
      <main className={`flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6 transition-all duration-300 ${
        isEditingTranscript ? 'pb-80' : 'pb-52 sm:pb-56'
      }`}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto space-y-4 sm:space-y-6">
          {recordingError && (
            <div
              className="mb-6 p-4 rounded-xl border text-sm"
              style={errorBannerStyle}
              role="alert"
              aria-live="assertive"
            >
              {recordingError}
            </div>
          )}
          
          {loading && (
            <div
              className="mb-6 p-4 rounded-xl border text-sm"
              style={loadingBannerStyle}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ink)' }}></div>
                <span>Processing your thought<span aria-hidden="true" className="inline"><span className="bounce-dot">.</span><span className="bounce-dot">.</span><span className="bounce-dot">.</span></span></span>
              </div>
            </div>
          )}

          {thoughts.length === 0 ? (
            <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-foreground)' }}>
              <p className="font-serif">No thoughts yet. Start recording to capture your first thought.</p>
            </div>
          ) : filteredThoughts.length === 0 ? (
            <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted-foreground)' }}>
              <p className="font-serif">
                {(searchQuery || activeTags.length > 0) ? 'No thoughts found matching your filters.' : 'No thoughts added'}
              </p>
            </div>
          ) : (
            sortedThoughts.map((thought) => (
              <div key={thought.id} data-thought-id={thought.id}>
                <ThoughtCard
                  thought={thought}
                  onDelete={handleDeleteThought}
                  onOpenAiPrompts={openAiPromptsFromCard}
                  onTagClick={handleTagClick}
                  activeTags={activeTags}
                  onAddFollowUp={handleAddFollowUp}
                  onDeleteFollowUp={handleDeleteFollowUp}
                  onEditFollowUp={handleEditFollowUp}
                  onSaveEdit={handleReprocessThought}
                  onDistillStateChange={handleDistillStateChange}
                  suggestedTags={suggestedTagsByThoughtId[thought.id] || []}
                  onConfirmSuggestedTag={handleConfirmSuggestedTag}
                  linkedPeople={linkedPeopleByThoughtId[String(thought.id)] || []}
                  onPersonClick={handlePersonClick}
                  onMentionClick={handleMentionClick}
                  clarifierForPersonId={clarifierForPersonId}
                  clarifierForThoughtId={clarifierForThoughtId}
                  onClarifierSubmit={handleClarifierSubmit}
                  onClarifierDismiss={handleClarifierDismiss}
                  confirmationList={confirmationPending.filter((e) => String(e.thoughtId) === String(thought.id))}
                  onConfirmationChoose={handleConfirmationChoose}
                  clarifierForNewPerson={clarifierForNewPerson && String(clarifierForNewPerson.thoughtId) === String(thought.id) ? clarifierForNewPerson : null}
                  onNewPersonClarifierComplete={handleNewPersonClarifierComplete}
                  disambiguationList={disambiguationPending.filter((e) => String(e.thoughtId) === String(thought.id))}
                  onDisambiguationChoose={handleDisambiguationChoose}
                  categories={categories}
                  onCategoriesChange={handleThoughtCategoriesChange}
                />
              </div>
            ))
          )}
        </div>
      </main>

      {openPersonId && (
        <PersonProfilePanel
          personId={openPersonId}
          person={peopleMap[openPersonId]}
          thoughts={openPersonThoughts}
          onClose={handleClosePersonPanel}
          onUnlink={handleUnlinkThoughtPerson}
          onScrollToThought={handleScrollToThought}
          onEditClarifier={handleEditClarifier}
          onPersonUpdate={(personId, updates) => {
            setPeopleMap((prev) => {
              const p = prev[personId]
              return p ? { ...prev, [personId]: { ...p, ...updates } } : prev
            })
          }}
        />
      )}

      {/* Transcript Editor - Fixed at bottom; owns its own state so typing doesn't re-render HomePage */}
      {isEditingTranscript && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t transition-all duration-300 ease-out"
          style={transcriptEditorOverlay}
        >
          <div className="max-w-[46.2rem] mx-auto px-6 py-4">
            <TranscriptEditor
              key={editorSessionKey}
              initialTranscript={initialTranscriptForEditor}
              onSubmit={handleSubmitTranscript}
              onCancel={handleCancelEdit}
              loading={loading}
              selectedPrompt={selectedPrompt}
              onClearPrompt={() => setSelectedPrompt(null)}
              showAiPrompts={showAiPrompts}
              onSelectPrompt={(prompt) => {
                setSelectedPrompt(prompt)
                setShowAiPrompts(false)
              }}
              aiPromptsEditorRef={aiPromptsEditorRef}
              skipPersistRef={skipPersistRef}
            />
          </div>
        </div>
      )}

      {/* Fixed Record Button - z-40 so it sits above timeline content (tags/cards) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 pb-8 sm:pb-12 pt-6 sm:pt-8 bg-gradient-to-t from-paper via-paper to-transparent pointer-events-none transition-all duration-300 ${
          isEditingTranscript ? 'opacity-0 translate-y-full' : 'opacity-100'
        }`}
        style={{ background: `linear-gradient(to top, var(--paper), var(--paper), transparent)` }}
      >
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex flex-col items-center justify-center gap-2 pointer-events-auto">
          {isAudioRecording && remainingTime !== null && (
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-serif tabular-nums shadow-sm"
              style={remainingTimeBadge}
              aria-live="polite"
            >
              {formatRemainingTime()} left
            </span>
          )}
          <div ref={aiPromptsRecordRef} className="flex items-end gap-3">
            <Tooltip text="Thought starters" position="top">
              <button
                onMouseDown={(e) => {
                  if (isEditingTranscript) return
                  e.preventDefault()
                  flushSync(() => setShowAiPrompts((prev) => !prev))
                }}
                className="mb-1 transition-colors flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full"
                aria-label="AI thought prompts"
                disabled={isEditingTranscript}
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--stroke)',
                  color: showAiPrompts ? 'var(--ink)' : 'var(--muted-foreground)',
                  opacity: isEditingTranscript ? 0.5 : 1,
                  cursor: isEditingTranscript ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isEditingTranscript) {
                    e.currentTarget.style.color = 'var(--ink)'
                    e.currentTarget.style.borderColor = 'var(--ink)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = showAiPrompts ? 'var(--ink)' : 'var(--muted-foreground)'
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                }}
              >
                <span className="inline-flex items-center justify-center flex-shrink-0 w-full h-full" style={{ color: 'inherit', transform: 'translateY(-2px)' }}>
                  <TbPencilQuestion className="w-6 h-6 sm:w-5 sm:h-5 block" style={{ color: 'inherit' }} />
                </span>
              </button>
            </Tooltip>
            <div className="relative flex items-end">
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-[min(90vw,28rem)] min-w-[18rem]"
                aria-hidden={!showAiPrompts}
                style={
                  showAiPrompts
                    ? undefined
                    : { visibility: 'hidden', pointerEvents: 'none' }
                }
              >
                <ThoughtStartersFlow
                  selectedPrompt={selectedPrompt}
                  onRecordWithPrompt={handleRecordWithPrompt}
                  onTypeWithPrompt={handleTypeWithPrompt}
                  useInlineHover
                />
              </div>
              <button
                onClick={handleRecordClick}
                className="group relative"
                aria-label={isAudioRecording ? "Stop recording" : "Start recording"}
                disabled={isEditingTranscript}
              >
              {/* Outer ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                  isAudioRecording
                    ? "scale-110 animate-pulse"
                    : "group-hover:scale-105"
                }`}
                style={{
                  borderColor: isAudioRecording ? 'var(--ink)' : 'var(--stroke)',
                }}
                onMouseEnter={(e) => {
                  if (!isAudioRecording && !isEditingTranscript) {
                    e.currentTarget.style.borderColor = 'var(--ink)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAudioRecording) {
                    e.currentTarget.style.borderColor = 'var(--stroke)'
                  }
                }}
              />

              {/* Main button */}
              <div
                className={`relative w-24 h-24 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  isAudioRecording 
                    ? "" 
                    : "group-hover:bg-muted/50"
                }`}
                style={{
                  backgroundColor: isAudioRecording 
                    ? 'var(--ink)' 
                    : 'var(--paper)',
                  backgroundImage: isAudioRecording
                    ? 'radial-gradient(circle at 30% 30%, rgba(0, 0, 0, 0.15), transparent 60%), radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 70%)'
                    : [
                        'radial-gradient(ellipse 80% 50% at 35% 25%, rgba(255, 255, 255, 0.5), transparent 55%)',
                        'radial-gradient(ellipse 70% 40% at 65% 75%, rgba(0, 0, 0, 0.12), transparent 55%)',
                        'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08), transparent 70%)'
                      ].join(', '),
                  color: isAudioRecording ? 'var(--paper)' : 'var(--ink)',
                  borderColor: isAudioRecording ? 'transparent' : 'var(--stroke)',
                  opacity: isEditingTranscript ? 0.5 : 0.88,
                  boxShadow: isAudioRecording
                    ? 'inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : 'inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08)'
                }}
              >
                {isAudioRecording ? (
                  <>
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {/* Small waveform above pause icon */}
                      {audioLevels.length > 0 && (
                        <div
                          className="flex items-end justify-center gap-0.5"
                          style={{ height: '14px', width: '2.5rem' }}
                          aria-hidden
                        >
                          {audioLevels.map((level, i) => (
                            <div
                              key={i}
                              className="w-0.5 rounded-full transition-all duration-75 ease-out flex-shrink-0"
                              style={{
                                height: `${Math.max(3, Math.round(level * 12))}px`,
                                backgroundColor: 'var(--paper)',
                                opacity: 0.85 + level * 0.15
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <Pause className="w-9 h-9 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    {showWarning && (
                      <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </>
                ) : (
                  <Mic className="w-9 h-9 sm:w-8 sm:h-8" strokeWidth={1.5} />
                )}
              </div>
            </button>
            </div>
            <Tooltip text="Type a thought" position="top">
              <button
                onClick={handleKeyboardToggle}
                className="mb-1 text-muted-foreground hover:text-ink transition-colors flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full"
                aria-label="Switch to typing mode"
                disabled={isEditingTranscript}
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--stroke)',
                  opacity: isEditingTranscript ? 0.5 : 1,
                  cursor: isEditingTranscript ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isEditingTranscript) {
                    e.currentTarget.style.color = 'var(--ink)'
                    e.currentTarget.style.borderColor = 'var(--ink)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                }}
              >
                <Keyboard className="w-6 h-6 sm:w-5 sm:h-5" strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Category Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={categoryToDelete !== null}
        onClose={cancelDeleteCategory}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the "${categoryToDelete}" category? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Thought Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={thoughtToDelete !== null}
        onClose={cancelDeleteThought}
        onConfirm={confirmDeleteThought}
        title="Delete Thought"
        message="Are you sure you want to delete this thought? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Follow-up Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={followUpToDelete !== null}
        onClose={cancelDeleteFollowUp}
        onConfirm={confirmDeleteFollowUp}
        title="Remove follow-up"
        message="Remove this follow-up? This cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  )
}
