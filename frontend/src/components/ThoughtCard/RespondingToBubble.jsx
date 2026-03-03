import { FaReply } from 'react-icons/fa'
import { respondingToBubble } from './styles'

export function RespondingToBubble({ respondingTo }) {
  if (!respondingTo) return null
  return (
    <div
      className="group mb-3 px-3 pt-2 pb-1 rounded-lg border font-serif text-sm flex items-start gap-4"
      style={respondingToBubble}
    >
      <FaReply className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
      <p className="italic text-muted-foreground flex-1" style={{ color: 'var(--muted-foreground)' }}>
        {respondingTo}
      </p>
    </div>
  )
}
