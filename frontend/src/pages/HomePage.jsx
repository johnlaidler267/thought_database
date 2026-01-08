import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Mic, Pause, MoreVertical, Copy, Trash2, Search, X, User, Plus, Check, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { supabase } from '../services/supabase'
import { transcribeAudio, cleanTranscript, extractTags } from '../services/api'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [thoughts, setThoughts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('axiomCategories')
    return saved ? JSON.parse(saved) : ['All']
  })
  const [activeCategory, setActiveCategory] = useState('All')
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const hoverTimeoutRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draftTranscript, setDraftTranscript] = useState('')
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const transcriptTextareaRef = useRef(null)
  const { isRecording: isAudioRecording, error: recordingError, startRecording, stopRecording } = useAudioRecorder()

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
      }
    }

    loadThoughts()
  }, [user])

  const handleDeleteThought = async (thoughtId) => {
    if (window.confirm('Are you sure you want to delete this thought?')) {
      if (supabase && user) {
        try {
          const { error } = await supabase
            .from('thoughts')
            .delete()
            .eq('id', thoughtId)
            .eq('user_id', user.id)

          if (error) throw error
        } catch (err) {
          console.error('Failed to delete from Supabase:', err)
        }
      }

      setThoughts(prev => prev.filter(thought => thought.id !== thoughtId))
    }
  }

  const handleRecordStart = () => {
    setIsRecording(true)
    startRecording()
  }

  const handleRecordStop = async () => {
    try {
      setIsRecording(false)
      setLoading(true)
      const audioBlob = await stopRecording()

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio recorded. Please try again.')
      }

      // Transcribe
      let transcript
      try {
        const result = await transcribeAudio(audioBlob)
        transcript = result.transcript
        if (!transcript || transcript.trim().length === 0) {
          throw new Error('No speech detected in recording.')
        }
      } catch (err) {
        console.error('Transcription error:', err)
        const errorMessage = err.message || 'Failed to transcribe audio'
        throw new Error(`Transcription failed: ${errorMessage}. Please ensure your backend is running.`)
      }

      // Show transcript in editable textbox
      setDraftTranscript(transcript)
      setIsEditingTranscript(true)
      setLoading(false)
      
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
  }

  const handleSubmitTranscript = async () => {
    if (!draftTranscript.trim()) {
      return
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
        console.warn('Cleaning failed, using edited transcript:', err)
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
      const newThought = {
        user_id: user?.id,
        raw_transcript: editedTranscript,
        cleaned_text: cleanedText,
        tags: tags,
        category: activeCategory !== 'All' ? activeCategory : null,
        created_at: new Date().toISOString(),
      }

      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('thoughts')
            .insert([newThought])
            .select()
            .single()

          if (error) throw error
          setThoughts(prev => [data, ...prev])
        } catch (err) {
          console.error('Failed to save to Supabase:', err)
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

      // Clear draft and close editor
      setDraftTranscript('')
      setIsEditingTranscript(false)
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

  // Save categories to localStorage when they change
  useEffect(() => {
    localStorage.setItem('axiomCategories', JSON.stringify(categories))
  }, [categories])

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

  // Handle deleting a category
  const handleDeleteCategory = (category) => {
    if (category === "All") return // Prevent deleting "All" category

    setCategories(categories.filter((cat) => cat !== category))

    // If the deleted category was active, switch to "All"
    if (activeCategory === category) {
      setActiveCategory("All")
    }
  }

  // Filter thoughts based on search query (by tag and content) and active category
  const filteredThoughts = thoughts.filter((thought) => {
    // Filter by category (if not "All")
    if (activeCategory !== 'All') {
      // Check if thought's category matches the active category
      if (thought.category !== activeCategory) {
        return false
      }
    }

    // Filter by search query (by tag and content)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      
      // Search in tags
      const matchesTag = thought.tags && thought.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      )
      
      // Search in cleaned text
      const matchesCleanedText = thought.cleaned_text && 
        thought.cleaned_text.toLowerCase().includes(query)
      
      // Search in raw transcript
      const matchesRawText = thought.raw_transcript && 
        thought.raw_transcript.toLowerCase().includes(query)
      
      // Return true if any of these match
      return matchesTag || matchesCleanedText || matchesRawText
    }

    return true
  })

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="border-b border-stroke px-6 py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-serif tracking-wide" style={{ color: 'var(--ink)' }}>Axiom</h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-serif" style={{ color: 'var(--muted-foreground)' }}>Never waste a good thought</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-serif">
            <span className="text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>Status:</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${isAudioRecording ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: isAudioRecording ? 'var(--ink)' : 'var(--muted-foreground)'
                }}
              />
              <span className="uppercase tracking-wider" style={{ color: 'var(--ink)' }}>
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
      <div className="border-b border-stroke px-6 py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: 'var(--muted-foreground)' }}
            />
            <input
              type="text"
              placeholder="Search by tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border rounded pl-11 pr-11 py-3 text-sm font-serif placeholder:text-muted-foreground focus:outline-none focus:border-ink transition-colors"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--stroke)',
                color: 'var(--ink)'
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
      <div className="border-b border-stroke px-6 py-3 overflow-x-auto" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              onMouseEnter={() => {
                // Clear any existing timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current)
                }
                // Set hovered category after 500ms delay
                hoverTimeoutRef.current = setTimeout(() => {
                  setHoveredCategory(category)
                }, 350)
              }}
              onMouseLeave={() => {
                // Clear timeout if mouse leaves before delay completes
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current)
                  hoverTimeoutRef.current = null
                }
                setHoveredCategory(null)
              }}
              className={`px-4 py-2 rounded font-serif text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                activeCategory === category
                  ? "text-paper"
                  : "border text-muted-foreground hover:text-ink hover:border-ink"
              }`}
              style={{
                backgroundColor: activeCategory === category ? 'var(--ink)' : 'var(--card)',
                borderColor: activeCategory === category ? 'transparent' : 'var(--stroke)',
                color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                paddingRight: hoveredCategory === category && category !== "All" ? 0 : '1rem',
                minHeight: '2.5rem',
                height: '2.5rem'
              }}
            >
              <span>{category}</span>
              {/* Delete button shown on hover (except for "All") */}
              {hoveredCategory === category && category !== "All" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                  className="transition-colors ml-1 flex items-center justify-center"
                  style={{ 
                    color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                    width: '0.75rem',
                    height: '0.75rem',
                    flexShrink: 0
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
                </button>
              )}
            </button>
          ))}

          {isAddingCategory ? (
            <div className="flex items-center gap-2">
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
                className="px-3 py-2 rounded border text-sm font-serif focus:outline-none w-32"
                style={{
                  borderColor: 'var(--stroke)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--ink)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--ink)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--stroke)'
                }}
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="px-3 py-2 rounded font-serif text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--ink)',
                  color: 'var(--paper)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--muted-foreground)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ink)'
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingCategory(false)
                  setNewCategoryName("")
                }}
                className="px-3 py-2 rounded border font-serif text-sm transition-colors"
                style={{
                  borderColor: 'var(--stroke)',
                  color: 'var(--muted-foreground)'
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
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="px-3 py-2 rounded border border-dashed transition-colors flex items-center gap-2 font-serif text-sm"
              style={{
                borderColor: 'var(--stroke)',
                color: 'var(--muted-foreground)'
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
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <main className={`flex-1 overflow-y-auto px-6 pt-6 transition-all duration-300 ${
        isEditingTranscript ? 'pb-80' : 'pb-40'
      }`}>
        <div className="max-w-2xl mx-auto space-y-6">
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
                <span>Processing your thought...</span>
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
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
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
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                    Press <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--stroke)', backgroundColor: 'var(--muted)' }}>⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--stroke)', backgroundColor: 'var(--muted)' }}>Enter</kbd> to save
                  </p>
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
        className={`fixed bottom-0 left-0 right-0 pb-12 pt-8 bg-gradient-to-t from-paper via-paper to-transparent pointer-events-none transition-all duration-300 ${
          isEditingTranscript ? 'opacity-0 translate-y-full' : 'opacity-100'
        }`}
        style={{ background: `linear-gradient(to top, var(--paper), var(--paper), transparent)` }}
      >
        <div className="max-w-2xl mx-auto flex justify-center pointer-events-auto">
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
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                isAudioRecording 
                  ? "" 
                  : "group-hover:bg-muted/50"
              }`}
              style={{
                backgroundColor: isAudioRecording ? 'var(--ink)' : 'var(--paper)',
                color: isAudioRecording ? 'var(--paper)' : 'var(--ink)',
                borderColor: isAudioRecording ? 'transparent' : 'var(--stroke)',
                opacity: isEditingTranscript ? 0.5 : 1
              }}
            >
              {isAudioRecording ? (
                <Pause className="w-8 h-8" strokeWidth={1.5} />
              ) : (
                <Mic className="w-8 h-8" strokeWidth={1.5} />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Thought Card Component with View Raw functionality
function ThoughtCard({ thought, onDelete }) {
  const [showRaw, setShowRaw] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  const displayText = showRaw ? (thought.raw_transcript || thought.content) : (thought.cleaned_text || thought.content)
  const timestamp = thought.created_at 
    ? new Date(thought.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : thought.timestamp || ''

  const duration = thought.duration || ''

  // Close menu when clicking outside
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
      await navigator.clipboard.writeText(thought.cleaned_text || thought.content)
      setCopied(true)
      setShowMenu(false)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDelete = () => {
    setShowMenu(false)
    onDelete(thought.id)
  }

  return (
    <Card
      className="border-stroke bg-card hover:bg-muted/30 transition-colors duration-200 p-6 shadow-none relative"
      style={{
        borderColor: 'var(--stroke)',
        backgroundColor: 'var(--card)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
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
          {/* View Raw Toggle */}
          {thought.raw_transcript && thought.raw_transcript !== thought.cleaned_text && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs px-3 py-1.5 rounded-md border transition-colors font-serif"
              style={{
                color: 'var(--muted-foreground)',
                borderColor: 'var(--stroke)',
                backgroundColor: showRaw ? 'var(--muted)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.borderColor = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.borderColor = 'var(--stroke)'
              }}
              aria-label={showRaw ? 'View cleaned version' : 'View raw transcript'}
            >
              {showRaw ? 'View Cleaned' : 'View Raw'}
            </button>
          )}
          {/* Overflow Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-muted-foreground hover:text-ink transition-colors p-1 rounded-md"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
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
                  onClick={handleCopy}
                  className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
                  style={{
                    color: 'var(--ink)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--muted)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm font-serif flex items-center gap-2 transition-colors hover:bg-muted"
                  style={{
                    color: 'var(--ink)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--muted)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-base leading-relaxed font-serif text-ink text-pretty mb-4" style={{ color: 'var(--ink)' }}>
        {displayText}
      </p>
      
      {/* Tags */}
      {thought.tags && thought.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {thought.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs font-serif border border-stroke rounded bg-muted/50 text-muted-foreground"
              style={{
                borderColor: 'var(--stroke)',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}