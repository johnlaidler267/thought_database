import { Sparkles } from 'lucide-react'

export function AiQuestionButton({ question, onClick }) {
  if (!question) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 mb-3 text-xs font-serif italic tracking-wide text-left w-full rounded transition-colors cursor-pointer hover:opacity-80 focus:outline-none focus:ring-0 border-0 bg-transparent p-0"
      style={{ color: 'var(--muted-foreground)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline'
        e.currentTarget.style.color = 'var(--ink)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none'
        e.currentTarget.style.color = 'var(--muted-foreground)'
      }}
      aria-label="Use this question as follow-up"
    >
      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'inherit' }} />
      <span>{question}</span>
    </button>
  )
}
