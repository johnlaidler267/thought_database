import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import Tooltip from '../components/ui/Tooltip'
import ConfirmDialog from '../components/ConfirmDialog'
import { Mic, Pause, MoreVertical, Copy, Trash2, Search, X, User, Plus, Check, XCircle, Keyboard, CheckCircle, Languages, ArrowUpDown } from 'lucide-react'
import { FaReply } from 'react-icons/fa'
import { TbPencilQuestion } from 'react-icons/tb'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { supabase } from '../services/supabase'
import { transcribeAudio, warmApiConnection, extractTags } from '../services/api'
import { translateText } from '../services/translation'
import { estimateTranscriptionTokens, estimateTokens } from '../utils/tokenEstimator'
import { FREE_TIER_TOKEN_LIMIT } from '../constants'
import { AI_PROMPTS } from '../constants/thoughtStarters'
import { hasRecoveryFlag, clearRecoveryFlag, getPendingRecording, clearPendingRecording } from '../utils/recordingRecovery'
import { ThoughtCard } from '../components/ThoughtCard'
import { ThoughtStartersPopover } from '../components/ThoughtStartersPopover'

export default function HomePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [thoughts, setThoughts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTags, setActiveTags] = useState([]) // tag chips in search bar; AND with text query
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc' (date only)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef(null)
  const [categories, setCategories] = useState(['All'])
  const [activeCategory, setActiveCategory] = useState('All')
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [thoughtToDelete, setThoughtToDelete] = useState(null)
  const [followUpToDelete, setFollowUpToDelete] = useState(null) // { thoughtId, index }
  const [suggestedTagsByThoughtId, setSuggestedTagsByThoughtId] = useState({})
  const hoverTimeoutRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draftTranscript, setDraftTranscript] = useState('')
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [showAiPrompts, setShowAiPrompts] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const transcriptTextareaRef = useRef(null)
  const isFromRecordingRef = useRef(false)
  const draftTranscriptRef = useRef('')
  const aiPromptsRecordRef = useRef(null)
  const aiPromptsEditorRef = useRef(null)
  const thoughtsRef = useRef(thoughts)
  useEffect(() => { thoughtsRef.current = thoughts }, [thoughts])

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

  // Load thoughts from Supabase on mount
  useEffect(() => {
    async function loadThoughts() {
      if (!user) return

      // In dev mode (no Supabase), use mock data
      if (!supabase) {
        const mockThoughts = [
          {
            id: '1',
            raw_transcript: 'Um, so I was thinking, like, you know, maybe we should, uh, consider doing this project differently? Like, what if we, um, started with a simpler approach?',
            cleaned_text: 'I was thinking maybe we should consider doing this project differently. What if we started with a simpler approach?',
            tags: ['Idea', 'Task'],
            category: null,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            raw_transcript: 'Oh, I need to remember to call Sarah tomorrow. She mentioned something about, um, the meeting? Yeah, the meeting on Friday.',
            cleaned_text: 'I need to remember to call Sarah tomorrow. She mentioned something about the meeting on Friday.',
            tags: ['Person', 'Task'],
            category: null,
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            raw_transcript: 'The idea of, like, building a personal knowledge base is really interesting. It could help me, um, organize my thoughts better and, you know, make connections between different concepts.',
            cleaned_text: 'The idea of building a personal knowledge base is really interesting. It could help me organize my thoughts better and make connections between different concepts.',
            tags: ['Idea'],
            category: null,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        ]
        setThoughts(mockThoughts)
        return
      }

      try {
        const { data, error } = await supabase
          .from('thoughts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data) {
          setThoughts(
            data.map((t) => ({
              ...t,
              follow_ups: Array.isArray(t.follow_ups) ? t.follow_ups : [],
            }))
          )
        }
      } catch (err) {
        console.error('Error loading thoughts:', err)
        // Check if it's a network/DNS error
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.error('⚠️ Cannot connect to Supabase. Check if your Supabase project is active and the URL is correct.')
        }
      }
    }

    loadThoughts()
  }, [user])

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

      // Show transcript immediately so the user isn't left waiting (especially important for new users where profile update can be slow)
      setDraftTranscript(transcript)
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
      
      // Focus textarea after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (transcriptTextareaRef.current) {
          transcriptTextareaRef.current.focus()
          // Move cursor to end
          transcriptTextareaRef.current.setSelectionRange(
            transcriptTextareaRef.current.value.length,
            transcriptTextareaRef.current.value.length
          )
        }
      }, 100)
    } catch (err) {
      console.error('Error processing recording:', err)
      const errorMessage = err.message || 'Failed to process recording. Please try again.'
      alert(errorMessage)
      setLoading(false)
    }
  }, [profile?.tier, profile?.tokens_used, user, supabase, refreshProfile, setDraftTranscript, setIsEditingTranscript, transcriptTextareaRef, isSilencePlaceholder])

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

  const handleSubmitTranscript = async () => {
    if (!draftTranscript.trim()) {
      return
    }

    try {
      setLoading(true)
      const editedTranscript = draftTranscript.trim()

      // Save as-typed: no AI cleanup or tagging on submission
      const category = activeCategory !== 'All' ? activeCategory : null

      const newThought = {
        user_id: user?.id,
        raw_transcript: editedTranscript,
        cleaned_text: editedTranscript,
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
          extractTags(editedTranscript, vocabulary)
            .then((result) => {
              const suggested = Array.isArray(result?.tags) ? result.tags : []
              const mentions = Array.isArray(result?.mentions) ? result.mentions : []
              const thought_type = result?.thought_type ?? null
              if (suggested.length > 0) {
                setSuggestedTagsByThoughtId((prev) => ({ ...prev, [data.id]: suggested }))
              }
              if (mentions.length > 0 || thought_type) {
                const dataIdStr = String(data.id)
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

      // Clear draft, selected prompt, and close editor
      setDraftTranscript('')
      setSelectedPrompt(null)
      setIsEditingTranscript(false)
      draftTranscriptRef.current = ''
      try { sessionStorage.removeItem('vellum_draft_pending') } catch {}
      // Reset recording flag
      isFromRecordingRef.current = false
    } catch (err) {
      console.error('Error saving thought:', err)
      const errorMessage = err.message || 'Failed to save thought. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setDraftTranscript('')
    setSelectedPrompt(null)
    setIsEditingTranscript(false)
    draftTranscriptRef.current = ''
    try { sessionStorage.removeItem('vellum_draft_pending') } catch {}
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
    // Open transcript editor for typing
    setDraftTranscript('')
    setShowAiPrompts(false)
    setIsEditingTranscript(true)
    isFromRecordingRef.current = false // Mark as typed, not recorded
    // Focus the textarea after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (transcriptTextareaRef.current) {
        transcriptTextareaRef.current.focus()
      }
    }, 100)
  }

  // Load categories for the current user (per-user to avoid leaking across accounts)
  useEffect(() => {
    if (!user?.id) {
      setCategories(['All'])
      setActiveCategory('All')
      return
    }
    const key = `axiomCategories_${user.id}`
    const saved = localStorage.getItem(key)
    const list = saved ? JSON.parse(saved) : ['All']
    setCategories(Array.isArray(list) ? list : ['All'])
    setActiveCategory('All')
  }, [user?.id])

  // Save categories to localStorage when they change (per-user key only)
  useEffect(() => {
    if (!user?.id || !categories.length) return
    const key = `axiomCategories_${user.id}`
    localStorage.setItem(key, JSON.stringify(categories))
  }, [user?.id, categories])

  // Restore draft transcript when returning from another page (e.g. Settings)
  useEffect(() => {
    if (!user) return
    try {
      const saved = sessionStorage.getItem('vellum_draft_pending')
      if (!saved) return
      const { transcript } = JSON.parse(saved)
      if (typeof transcript === 'string' && transcript.trim() !== '') {
        setDraftTranscript(transcript)
        setShowAiPrompts(false)
        setIsEditingTranscript(true)
      }
      sessionStorage.removeItem('vellum_draft_pending')
    } catch {
      sessionStorage.removeItem('vellum_draft_pending')
    }
  }, [user?.id])

  // Keep ref in sync so unmount cleanup can read latest draft without re-running effect on every keystroke
  draftTranscriptRef.current = draftTranscript

  // Persist draft transcript only on unmount (navigate away) so it can be restored when coming back
  useEffect(() => {
    return () => {
      const latest = draftTranscriptRef.current
      if (latest && latest.trim()) {
        try {
          sessionStorage.setItem('vellum_draft_pending', JSON.stringify({ transcript: latest }))
        } catch {}
      }
    }
  }, [])

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

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

  // Handle adding a new category
  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim()
    if (trimmedName && !categories.includes(trimmedName)) {
      setCategories([...categories, trimmedName])
      setActiveCategory(trimmedName)
      setIsAddingCategory(false)
      setNewCategoryName('')
    }
  }

  // Handle deleting a category - show confirmation dialog
  const handleDeleteCategory = (category) => {
    if (category === "All") return // Prevent deleting "All" category
    setCategoryToDelete(category)
  }

  // Confirm category deletion
  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return

    setCategories(categories.filter((cat) => cat !== categoryToDelete))

    // If the deleted category was active, switch to "All"
    if (activeCategory === categoryToDelete) {
      setActiveCategory("All")
    }

    setCategoryToDelete(null)
  }

  // Cancel category deletion
  const cancelDeleteCategory = () => {
    setCategoryToDelete(null)
  }

  const openAiPromptsFromCard = useCallback(() => setShowAiPrompts(true), [])

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
        if (thought.category !== activeCategory) return false
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
    <div className="min-h-screen bg-paper flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={isDark ? '/logo-dark.png' : '/logo.png'} alt="" className="h-6 w-6 object-contain" aria-hidden />
            <h1 className="text-lg font-serif tracking-wide" style={{ color: 'var(--ink)' }}>Vellum</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-serif">
            <span className="text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>Status:</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${isAudioRecording ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: isAudioRecording ? (showWarning ? '#ff3b30' : 'var(--ink)') : 'var(--muted-foreground)'
                }}
              />
              <span className={`uppercase tracking-wider ${showWarning ? 'font-medium' : ''}`} style={{ color: showWarning ? '#ff3b30' : 'var(--ink)' }}>
                {isAudioRecording ? "Recording" : "Ready"}
              </span>
            </div>
            {user && (
              <button
                onClick={handleProfileClick}
                className="text-muted-foreground hover:text-ink transition-colors rounded-full flex items-center justify-center"
                style={{ 
                  color: 'var(--muted-foreground)',
                  width: '2rem',
                  height: '2rem',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink)'
                  e.currentTarget.style.backgroundColor = 'var(--muted)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                aria-label="Account settings"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar: tag chips + free text input */}
      <div className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <div
              className="flex flex-wrap items-center gap-2 rounded border border-stroke py-2 pl-10 pr-10 font-serif transition-colors focus-within:border-ink"
              style={{
                backgroundColor: 'var(--card)',
                minHeight: '44px'
              }}
            >
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--muted-foreground)' }}
              />
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-sm font-serif text-xs leading-tight shrink-0 py-0.5 px-2"
                style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)'
                }}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center rounded-sm transition-colors hover:opacity-70"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-2.5 h-2.5" strokeWidth={2} />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={activeTags.length > 0 ? 'Add more tags or type to search...' : 'Search or click a tag...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[8rem] py-0.5 bg-transparent border-0 font-serif placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              style={{
                color: 'var(--ink)',
                fontSize: '16px'
              }}
            />
            {(searchQuery || activeTags.length > 0) && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveTags([]) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)' }}
                aria-label="Clear search and tags"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            </div>
          </div>
          <div className="relative flex-shrink-0" ref={sortMenuRef}>
            <Tooltip text="Sort" position="bottom">
              <button
                type="button"
                onClick={() => setSortMenuOpen((o) => !o)}
                className="flex items-center justify-center w-10 h-10 rounded border font-serif transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--stroke)',
                  color: 'var(--muted-foreground)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ink)'
                  e.currentTarget.style.color = 'var(--ink)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }}
                aria-label="Sort"
                aria-expanded={sortMenuOpen}
              >
                <ArrowUpDown className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </Tooltip>
            {sortMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-md border shadow-lg z-20 py-1"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--stroke)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                <button
                  type="button"
                  onClick={() => { setSortOrder('desc'); setSortMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm font-serif transition-colors"
                  style={{
                    color: sortOrder === 'desc' ? 'var(--ink)' : 'var(--muted-foreground)',
                    backgroundColor: sortOrder === 'desc' ? 'var(--muted)' : 'transparent'
                  }}
                >
                  Date (newest first)
                </button>
                <button
                  type="button"
                  onClick={() => { setSortOrder('asc'); setSortMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm font-serif transition-colors"
                  style={{
                    color: sortOrder === 'asc' ? 'var(--ink)' : 'var(--muted-foreground)',
                    backgroundColor: sortOrder === 'asc' ? 'var(--muted)' : 'transparent'
                  }}
                >
                  Date (oldest first)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div 
        className="border-b border-stroke px-4 sm:px-6 py-3 overflow-x-auto category-tabs-container" 
        style={{ 
          borderColor: 'var(--stroke)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex items-center gap-2 flex-nowrap" style={{ width: 'max-content', minWidth: 'max-content' }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded font-serif text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                activeCategory === category
                  ? "text-paper"
                  : "border text-muted-foreground hover:text-ink hover:border-ink"
              }`}
              style={{
                backgroundColor: activeCategory === category ? 'var(--ink)' : 'var(--card)',
                borderColor: activeCategory === category ? 'transparent' : 'var(--stroke)',
                color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                paddingLeft: '1rem',
                paddingRight: category !== "All" ? '0.75rem' : '1rem',
                minHeight: '2.5rem',
                height: '2.5rem',
                minWidth: 'fit-content'
              }}
            >
              <span className="flex-shrink-0">{category}</span>
              {/* Delete button always visible (except for "All") */}
              {category !== "All" && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteCategory(category)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ 
                    color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                    width: '1rem',
                    height: '1rem',
                    minWidth: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--destructive)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)'
                  }}
                  aria-label={`Delete ${category} category`}
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}

          {isAddingCategory ? (
            <div className="relative flex-shrink-0">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory()
                  if (e.key === "Escape") {
                    setIsAddingCategory(false)
                    setNewCategoryName("")
                  }
                }}
                placeholder="Category name..."
                className="px-4 py-2 pr-10 rounded border border-stroke bg-card font-serif focus:outline-none focus:border-ink w-40"
                style={{
                  height: '2.5rem',
                  minHeight: '2.5rem'
                }}
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-muted-foreground transition-colors"
                aria-label="Add category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="px-3 py-2 rounded border border-dashed transition-colors flex items-center gap-2 font-serif text-sm flex-shrink-0 whitespace-nowrap"
              style={{
                borderColor: 'var(--stroke)',
                color: 'var(--muted-foreground)',
                minHeight: '2.5rem',
                height: '2.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.borderColor = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.borderColor = 'var(--stroke)'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Timeline - extra bottom padding so card tags stay above the fixed record buttons */}
      <main className={`flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6 transition-all duration-300 ${
        isEditingTranscript ? 'pb-80' : 'pb-52 sm:pb-56'
      }`}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto space-y-4 sm:space-y-6">
          {recordingError && (
            <div 
              className="mb-6 p-4 rounded-xl border text-sm"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--ink)'
              }}
              role="alert"
              aria-live="assertive"
            >
              {recordingError}
            </div>
          )}
          
          {loading && (
            <div 
              className="mb-6 p-4 rounded-xl border text-sm"
              style={{ 
                background: 'var(--muted)',
                borderColor: 'var(--stroke)',
                color: 'var(--ink)'
              }}
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
              <ThoughtCard
                key={thought.id}
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
              />
            ))
          )}
        </div>
      </main>

      {/* Transcript Editor - Fixed at bottom */}
      {isEditingTranscript && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 border-t transition-all duration-300 ease-out"
          style={{ 
            borderColor: 'var(--stroke)',
            backgroundColor: 'var(--paper)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-[46.2rem] mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {selectedPrompt && (
                  <div
                    className="group relative flex items-center gap-4 mb-3 pl-3 pr-14 sm:pr-10 py-2 rounded-lg border font-serif text-sm"
                    style={{
                      borderColor: 'var(--stroke)',
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)'
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
                      onClick={() => setSelectedPrompt(null)}
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
                    <ThoughtStartersPopover
                      prompts={AI_PROMPTS}
                      selectedPrompt={selectedPrompt}
                      onSelectPrompt={setSelectedPrompt}
                      useInlineHover={false}
                    />
                  </div>
                )}
                <div className="mb-2" aria-hidden />
                <textarea
                  ref={transcriptTextareaRef}
                  value={draftTranscript}
                  onChange={(e) => setDraftTranscript(e.target.value)}
                  onKeyDown={(e) => {
                    // Submit on Cmd/Ctrl + Enter
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmitTranscript()
                    }
                    // Cancel on Escape
                    if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border resize-none font-serif text-base leading-relaxed focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--stroke)',
                    color: 'var(--ink)',
                    minHeight: '120px',
                    maxHeight: '300px'
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
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg border font-serif text-sm transition-colors flex items-center gap-2"
                      style={{
                        borderColor: 'var(--stroke)',
                        color: 'var(--muted-foreground)',
                        backgroundColor: 'transparent'
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
                      onClick={handleSubmitTranscript}
                      disabled={!draftTranscript.trim() || loading}
                      className="px-4 py-2 rounded-lg font-serif text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--ink)',
                        color: 'var(--paper)'
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
              style={{
                color: 'var(--ink)',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--stroke)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
              }}
              aria-live="polite"
            >
              {formatRemainingTime()} left
            </span>
          )}
          <div ref={aiPromptsRecordRef} className="flex items-end gap-3">
            <Tooltip text="Thought starters" position="top">
              <button
                onClick={() => setShowAiPrompts(!showAiPrompts)}
                className={`mb-1 transition-colors flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full ${showAiPrompts ? 'text-ink' : 'text-muted-foreground hover:text-ink'}`}
                aria-label="AI thought prompts"
                disabled={isEditingTranscript}
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--stroke)',
                  opacity: isEditingTranscript ? 0.5 : 1,
                  cursor: isEditingTranscript ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isEditingTranscript) {
                    e.currentTarget.style.borderColor = 'var(--ink)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                }}
              >
                <span className="inline-flex items-center justify-center flex-shrink-0 w-full h-full">
                  <TbPencilQuestion className="w-6 h-6 sm:w-5 sm:h-5 block" />
                </span>
              </button>
            </Tooltip>
            <div className="relative flex items-end">
              {showAiPrompts && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-[min(90vw,28rem)] min-w-[18rem]">
                  <ThoughtStartersPopover
                    prompts={AI_PROMPTS}
                    selectedPrompt={selectedPrompt}
                    onSelectPrompt={setSelectedPrompt}
                    useInlineHover
                  />
                </div>
              )}
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
                    : 'radial-gradient(circle at 30% 30%, rgba(0, 0, 0, 0.08), transparent 60%), radial-gradient(circle at center, rgba(255, 255, 255, 0.15), transparent 70%)',
                  color: isAudioRecording ? 'var(--paper)' : 'var(--ink)',
                  borderColor: isAudioRecording ? 'transparent' : 'var(--stroke)',
                  opacity: isEditingTranscript ? 0.5 : 1,
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
