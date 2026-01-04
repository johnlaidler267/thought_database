import { useState, useEffect } from 'react'
import RecordButton from './components/RecordButton'
import ThoughtTimeline from './components/ThoughtTimeline'
import EditableTitle from './components/EditableTitle'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { supabase } from './services/supabase'
import { transcribeAudio, cleanTranscript, extractTags } from './services/api'

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
        throw new Error('Failed to transcribe audio. Please check your backend is running and API keys are configured.')
      }

      // Clean transcript
      let cleanedText
      try {
        cleanedText = await cleanTranscript(transcript)
        if (!cleanedText || cleanedText.trim().length === 0) {
          cleanedText = transcript // Fallback to raw if cleaning fails
        }
      } catch (err) {
        console.warn('Cleaning failed, using raw transcript:', err)
        cleanedText = transcript // Fallback to raw transcript
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
        tags = [] // Continue without tags
      }

      // Save to Supabase
      const newThought = {
        raw_transcript: transcript,
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
          // Still add to local state even if Supabase fails
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
    } catch (err) {
      console.error('Error processing recording:', err)
      const errorMessage = err.message || 'Failed to process recording. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#2c2c2e', backgroundAttachment: 'fixed' }}>
      {/* Centered Title */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#2c2c2e]/90 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <EditableTitle />
      </div>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-8 py-8 pb-28">
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

      {/* Fixed Record Button */}
      <RecordButton
        onRecordStart={handleRecordStart}
        onRecordStop={handleRecordStop}
        isRecording={isRecording}
      />
    </div>
  )
}

export default App
