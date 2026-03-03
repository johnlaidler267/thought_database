import { CheckCircle } from 'lucide-react'
import { copyToast } from './styles'
import { ink } from './styles'

export function CopyToast() {
  return (
    <div
      className="absolute bottom-16 right-4 px-4 py-2.5 rounded-md shadow-lg z-20 flex items-center gap-2 transition-all duration-200"
      style={copyToast}
    >
      <CheckCircle className="w-4 h-4" style={ink} />
      <span className="text-sm font-serif" style={ink}>
        Copied
      </span>
    </div>
  )
}
