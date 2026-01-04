import ThoughtBubble from './ThoughtBubble'

export default function ThoughtTimeline({ thoughts, onDelete }) {
  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/70">
        <p className="font-sans">No thoughts yet. Start recording to capture your first thought.</p>
      </div>
    )
  }

  // Sort by created_at descending (newest first)
  const sortedThoughts = [...thoughts].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <div className="pb-24">
      {sortedThoughts.map((thought) => (
        <ThoughtBubble key={thought.id} thought={thought} onDelete={onDelete} />
      ))}
    </div>
  )
}
