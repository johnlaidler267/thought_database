import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Mic, Pause, MoreVertical } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [thoughts] = useState([
    {
      id: "1",
      content:
        "The essence of minimalism lies not in the absence of elements, but in the presence of only what matters most. Each decision should serve a purpose.",
      timestamp: "18:45:23",
      duration: "00:12",
    },
    {
      id: "2",
      content: "Voice notes capture the raw immediacy of thought—unfiltered, authentic, and ephemeral in their nature.",
      timestamp: "17:32:15",
      duration: "00:08",
    },
    {
      id: "3",
      content:
        "Consider how the interface becomes invisible when done correctly. The technology recedes, and only the human experience remains.",
      timestamp: "16:18:47",
      duration: "00:15",
    },
    {
      id: "4",
      content:
        "Monochrome palettes force designers to think about hierarchy, weight, and rhythm rather than relying on color as a crutch.",
      timestamp: "14:52:31",
      duration: "00:11",
    },
  ])

  const handleRecordClick = () => {
    if (isRecording) {
      setIsRecording(false)
      // Navigate to timeline after recording
      navigate('/timeline')
    } else {
      setIsRecording(true)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <header className="border-b border-stroke px-6 py-4" style={{ borderColor: 'var(--stroke)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-serif tracking-wide" style={{ color: 'var(--ink)' }}>Voice Notepad</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-serif" style={{ color: 'var(--muted-foreground)' }}>Capture your thoughts</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-serif">
            <span className="text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>Status:</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${isRecording ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: isRecording ? 'var(--ink)' : 'var(--muted-foreground)'
                }}
              />
              <span className="uppercase tracking-wider" style={{ color: 'var(--ink)' }}>
                {isRecording ? "Recording" : "Ready"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <main className="flex-1 overflow-y-auto px-6 py-12 pb-40">
        <div className="max-w-2xl mx-auto space-y-6">
          {thoughts.map((thought) => (
            <Card
              key={thought.id}
              className="border-stroke bg-card hover:bg-muted/30 transition-colors duration-200 p-6 shadow-none"
              style={{
                borderColor: 'var(--stroke)',
                backgroundColor: 'var(--card)'
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-serif" style={{ color: 'var(--muted-foreground)' }}>
                  <span className="tracking-wide">{thought.timestamp}</span>
                  <span className="w-px h-3 bg-stroke" style={{ backgroundColor: 'var(--stroke)' }} />
                  <span className="tracking-wide">{thought.duration}</span>
                </div>
                <button 
                  className="text-muted-foreground hover:text-ink transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <p className="text-base leading-relaxed font-serif text-ink text-pretty" style={{ color: 'var(--ink)' }}>
                {thought.content}
              </p>
            </Card>
          ))}
        </div>
      </main>

      {/* Fixed Record Button */}
      <div className="fixed bottom-0 left-0 right-0 pb-12 pt-8 bg-gradient-to-t from-paper via-paper to-transparent pointer-events-none" style={{ background: `linear-gradient(to top, var(--paper), var(--paper), transparent)` }}>
        <div className="max-w-2xl mx-auto flex justify-center pointer-events-auto">
          <button
            onClick={handleRecordClick}
            className="group relative"
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {/* Outer ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                isRecording
                  ? "scale-110 animate-pulse"
                  : "group-hover:scale-105"
              }`}
              style={{
                borderColor: isRecording ? 'var(--ink)' : 'var(--stroke)',
              }}
              onMouseEnter={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.borderColor = 'var(--ink)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.borderColor = 'var(--stroke)'
                }
              }}
            />

            {/* Main button */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                isRecording 
                  ? "" 
                  : "group-hover:bg-muted/50"
              }`}
              style={{
                backgroundColor: isRecording ? 'var(--ink)' : 'var(--paper)',
                color: isRecording ? 'var(--paper)' : 'var(--ink)',
                borderColor: isRecording ? 'transparent' : 'var(--stroke)',
              }}
            >
              {isRecording ? (
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

