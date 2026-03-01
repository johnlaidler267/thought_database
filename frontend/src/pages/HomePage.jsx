import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import Tooltip from '../components/ui/Tooltip'
import ConfirmDialog from '../components/ConfirmDialog'
import { Mic, Pause, MoreVertical, Copy, Trash2, Search, X, User, Plus, Check, XCircle, Keyboard, CheckCircle, Languages, Brain } from 'lucide-react'
import { FaReply } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { supabase } from '../services/supabase'
import { transcribeAudio, cleanTranscript, extractTags, warmApiConnection } from '../services/api'
import { translateText } from '../services/translation'
import { estimateTranscriptionTokens, estimateTokens, estimateTotalTokens, estimateTypedThoughtTokens } from '../utils/tokenEstimator'
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
  const [categories, setCategories] = useState(['All'])
  const [activeCategory, setActiveCategory] = useState('All')
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [thoughtToDelete, setThoughtToDelete] = useState(null)
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
          setThoughts(data)
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

    // Enforce free tier token cap before using clean/tag APIs
    if (profile?.tier === 'trial') {
      const used = profile?.tokens_used || 0
      if (used >= FREE_TIER_TOKEN_LIMIT) {
        alert(`You've reached your free tier limit (${FREE_TIER_TOKEN_LIMIT.toLocaleString()} tokens this month). Upgrade in Settings to add more thoughts.`)
        return
      }
    }

    try {
      setLoading(true)
      const editedTranscript = draftTranscript.trim()

      // Clean transcript
      let cleanedText
      try {
        cleanedText = await cleanTranscript(editedTranscript)
        
        if (!cleanedText || cleanedText.trim().length === 0) {
          cleanedText = editedTranscript
        }
      } catch (err) {
        console.error('Cleaning failed, using edited transcript:', err)
        cleanedText = editedTranscript
      }

      // Extract tags
      let tags = []
      try {
        tags = await extractTags(cleanedText)
        if (!Array.isArray(tags)) {
          tags = []
        }
      } catch (err) {
        console.warn('Tag extraction failed:', err)
        tags = []
      }

      // Save to Supabase
      // Save category if activeCategory is not "All", otherwise save null
      const category = activeCategory !== 'All' ? activeCategory : null
      
      const newThought = {
        user_id: user?.id,
        raw_transcript: editedTranscript,
        cleaned_text: cleanedText,
        tags: tags,
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
          let data, error
          
          // Try to insert with category first
          const result = await supabase
            .from('thoughts')
            .insert([newThought])
            .select()
            .single()
          
          data = result.data
          error = result.error

          // If error is due to missing category column, retry without it
          if (error && error.code === 'PGRST204' && error.message?.includes('category')) {
            console.warn('Category column not found, retrying without category field')
            const thoughtWithoutCategory = { ...newThought }
            delete thoughtWithoutCategory.category
            
            const retryResult = await supabase
              .from('thoughts')
              .insert([thoughtWithoutCategory])
              .select()
              .single()
            
            data = retryResult.data
            error = retryResult.error
            
            // Add category to the returned data for local state
            if (data) {
              data.category = newThought.category
            }
          }

          // If error is due to missing responding_to column, retry without it (and without category to avoid double-fail)
          if (error && error.code === 'PGRST204' && error.message?.includes('responding_to')) {
            console.warn('responding_to column not found, retrying without it')
            const fallback = { ...newThought }
            delete fallback.responding_to
            delete fallback.category

            const retryResult = await supabase
              .from('thoughts')
              .insert([fallback])
              .select()
              .single()

            data = retryResult.data
            error = retryResult.error

            if (data) {
              data.responding_to = newThought.responding_to
              data.category = newThought.category
            }
          }

          if (error) {
            console.error('Supabase insert error:', error)
            throw error
          }
          
          console.log('Thought saved successfully:', data)
          setThoughts(prev => [data, ...prev])
          
          // Update usage for apprentice and trial tiers (track tokens_used)
          // Transcription was already charged when the transcript was received; here we only charge cleaning + tagging
          if ((profile?.tier === 'apprentice' || profile?.tier === 'trial') && supabase && user) {
            try {
              // For both recorded and typed thoughts: only cleaning + tagging (transcription charged on receipt of transcript)
              const tokensUsed = estimateTypedThoughtTokens(editedTranscript, cleanedText, tags)
              
              if (tokensUsed > 0) {
                // Increment tokens_used
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    tokens_used: (profile.tokens_used || 0) + tokensUsed 
                  })
                  .eq('id', user.id)
                
                if (updateError) {
                  console.warn('Failed to update usage:', updateError)
                } else {
                  // Refresh profile to show updated usage
                  refreshProfile().catch(err => console.warn('Failed to refresh profile:', err))
                }
              }
            } catch (updateErr) {
              console.warn('Error updating usage:', updateErr)
            }
          }
          
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
    setThoughtToDelete(null)
  }

  const cancelDeleteThought = () => {
    setThoughtToDelete(null)
  }

  // Filter thoughts based on search query (by tag and content) and active category
  const filteredThoughts = useMemo(() => {
    return thoughts.filter((thought) => {
      // Filter by category (if not "All")
      if (activeCategory !== 'All') {
        if (thought.category !== activeCategory) return false
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTag = thought.tags && thought.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        )
        const matchesCleanedText = thought.cleaned_text &&
          thought.cleaned_text.toLowerCase().includes(query)
        const matchesRawText = thought.raw_transcript &&
          thought.raw_transcript.toLowerCase().includes(query)
        return matchesTag || matchesCleanedText || matchesRawText
      }
      return true
    })
  }, [thoughts, searchQuery, activeCategory])

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

      {/* Search Bar */}
      <div className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto">
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: 'var(--muted-foreground)' }}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border rounded pl-11 pr-11 py-3 font-serif placeholder:text-muted-foreground focus:outline-none focus:border-ink transition-colors"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--stroke)',
                color: 'var(--ink)',
                fontSize: '16px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ink)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--stroke)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
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

      {/* Timeline */}
      <main className={`flex-1 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-6 transition-all duration-300 ${
        isEditingTranscript ? 'pb-80' : 'pb-40'
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
                {searchQuery ? `No thoughts found matching "${searchQuery}".` : 'No thoughts added'}
              </p>
            </div>
          ) : (
            filteredThoughts.map((thought) => (
              <ThoughtCard
                key={thought.id}
                thought={thought}
                onDelete={handleDeleteThought}
                onOpenAiPrompts={openAiPromptsFromCard}
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
                  <div className="mb-3 w-full max-w-[min(90vw,28rem)]">
                    <ThoughtStartersPopover
                      prompts={AI_PROMPTS}
                      selectedPrompt={selectedPrompt}
                      onSelectPrompt={setSelectedPrompt}
                      useInlineHover={false}
                    />
                  </div>
                )}
                <label 
                  className="block text-xs font-serif mb-2 tracking-wide uppercase"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Edit Transcript
                </label>
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

      {/* Fixed Record Button */}
      <div 
        className={`fixed bottom-0 left-0 right-0 pb-8 sm:pb-12 pt-6 sm:pt-8 bg-gradient-to-t from-paper via-paper to-transparent pointer-events-none transition-all duration-300 ${
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
          <div className="flex items-end gap-3">
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
              <Brain className="w-6 h-6 sm:w-5 sm:h-5" strokeWidth={1.5} />
            </button>
            <div className="relative">
              {showAiPrompts && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-10 w-[min(90vw,28rem)] min-w-[18rem]">
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
    </div>
  )
}
