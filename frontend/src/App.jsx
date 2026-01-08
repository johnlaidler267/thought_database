import { useState, useEffect, useRef } from 'react'
import RecordButton from './components/RecordButton'
import ThoughtTimeline from './components/ThoughtTimeline'
import EditableTitle from './components/EditableTitle'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { supabase } from './services/supabase'
import { transcribeAudio, cleanTranscript, extractTags } from './services/api'
import { Check, XCircle } from 'lucide-react'

// Mock data for initial display
const mockThoughts = [
  {
    id: '1',
    raw_transcript: 'Um, so I was thinking, like, you know, maybe we should, uh, consider doing this project differently? Like, what if we, um, started with a simpler approach?',
    cleaned_text: 'I was thinking maybe we should consider doing this project differently. What if we started with a simpler approach?',
    tags: ['Idea', 'Task'],
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    raw_transcript: 'Oh, I need to remember to call Sarah tomorrow. She mentioned something about, um, the meeting? Yeah, the meeting on Friday.',
    cleaned_text: 'I need to remember to call Sarah tomorrow. She mentioned something about the meeting on Friday.',
    tags: ['Person', 'Task'],
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    raw_transcript: 'The idea of, like, building a personal knowledge base is really interesting. It could help me, um, organize my thoughts better and, you know, make connections between different concepts.',
    cleaned_text: 'The idea of building a personal knowledge base is really interesting. It could help me organize my thoughts better and make connections between different concepts.',
    tags: ['Idea'],
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

function App() {
  const [thoughts, setThoughts] = useState(mockThoughts)
  const [loading, setLoading] = useState(false)
  const [draftTranscript, setDraftTranscript] = useState('')
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const transcriptTextareaRef = useRef(null)
  const { isRecording, error: recordingError, startRecording, stopRecording } = useAudioRecorder()

  // Load thoughts from Supabase on mount
  useEffect(() => {
    async function loadThoughts() {
      if (!supabase) {
        // Using mock data if Supabase not configured
        return
      }

      try {
        const { data, error } = await supabase
          .from('thoughts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data && data.length > 0) {
          setThoughts(data)
        }
      } catch (err) {
        console.error('Error loading thoughts:', err)
      }
    }

    loadThoughts()
  }, [])

  const handleDeleteThought = async (thoughtId) => {
    if (window.confirm('Are you sure you want to delete this thought?')) {
      // Delete from Supabase if configured
      if (supabase) {
        try {
          const { error } = await supabase
            .from('thoughts')
            .delete()
            .eq('id', thoughtId)

          if (error) throw error
        } catch (err) {
          console.error('Failed to delete from Supabase:', err)
        }
      }

      // Remove from local state
      setThoughts(prev => prev.filter(thought => thought.id !== thoughtId))
    }
  }

  const handleRecordStart = () => {
    startRecording()
  }

  const handleRecordStop = async () => {
    try {
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
        raw_transcript: editedTranscript,
        cleaned_text: cleanedText,
        tags: tags,
        created_at: new Date().toISOString(),
      }

      if (supabase) {
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
        // Mock mode - just add to local state
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

  return (
    <div className="min-h-screen" style={{ background: '#2c2c2e', backgroundAttachment: 'fixed' }}>
      {/* Centered Title */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#2c2c2e]/90 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <EditableTitle />
      </div>

      {/* Main Content */}
      <main className={`max-w-xl mx-auto px-8 py-8 transition-all duration-300 ${
        isEditingTranscript ? 'pb-80' : 'pb-28'
      }`}>
        {recordingError && (
          <div 
            className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 text-sm backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            {recordingError}
          </div>
        )}
        
        {loading && (
          <div 
            className="mb-6 p-4 rounded-xl backdrop-blur-sm border text-sm fade-in-up text-white"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Processing your thought...</span>
            </div>
          </div>
        )}

        <ThoughtTimeline thoughts={thoughts} onDelete={handleDeleteThought} />
      </main>

      {/* Transcript Editor - Fixed at bottom */}
      {isEditingTranscript && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 border-t transition-all duration-300 ease-out"
          style={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: '#2c2c2e',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="max-w-xl mx-auto px-8 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label 
                  className="block text-xs font-medium mb-2 tracking-wide uppercase text-white/60"
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
                  className="w-full px-4 py-3 rounded-lg border resize-none text-base leading-relaxed focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    minHeight: '120px',
                    maxHeight: '300px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  }}
                  placeholder="Edit your transcript here..."
                  rows={4}
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-white/50">
                    Press <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5">Enter</kbd> to save
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg border font-medium text-sm transition-colors flex items-center gap-2"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'white'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitTranscript}
                      disabled={!draftTranscript.trim() || loading}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: '#007AFF',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#0051D5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#007AFF'
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
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 ${
          isEditingTranscript ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100'
        }`}
      >
        <RecordButton
          onRecordStart={handleRecordStart}
          onRecordStop={handleRecordStop}
          isRecording={isRecording}
        />
      </div>
    </div>
  )
}

export default App
