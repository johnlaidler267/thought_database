import { Check } from 'lucide-react'
import { Card } from './ui/Card'

/**
 * Thought starters list: used in the transcript editor and above the record button.
 * @param {Object} props
 * @param {string[]} props.prompts - List of prompt strings
 * @param {string|null} props.selectedPrompt - Currently selected prompt
 * @param {function(string): void} props.onSelectPrompt - Called when a prompt is clicked
 * @param {boolean} [props.useInlineHover] - If true, use inline onMouseEnter/Leave for hover (for record-bar popup)
 */
export function ThoughtStartersPopover({ prompts, selectedPrompt, onSelectPrompt, useInlineHover = false }) {
  return (
    <Card
      className="border border-stroke p-4 overflow-y-auto"
      style={{
        maxHeight: 'min(55vh, 32rem, calc(100vh - 10rem))',
        backgroundColor: 'var(--card)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
      }}
    >
      <p className="text-xs font-serif font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Thought starters
      </p>
      <div className="space-y-2">
        {prompts.map((prompt) => {
          const isSelected = selectedPrompt === prompt
          return (
            <button
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              className={`flex items-start gap-2 w-full text-left text-sm font-serif text-ink leading-relaxed py-2 pl-0 pr-3 rounded transition-colors duration-150 ${!useInlineHover && (isSelected ? 'bg-muted/30' : '')} ${!useInlineHover ? 'hover:bg-muted/60' : ''}`}
              style={useInlineHover ? { backgroundColor: isSelected ? 'var(--muted)' : 'transparent' } : undefined}
              onMouseEnter={useInlineHover ? (e) => { e.currentTarget.style.backgroundColor = 'var(--muted)' } : undefined}
              onMouseLeave={useInlineHover ? (e) => { e.currentTarget.style.backgroundColor = isSelected ? 'var(--muted)' : 'transparent' } : undefined}
            >
              <span className="flex-shrink-0 w-4 flex items-center justify-center ml-1" style={{ height: '1.625em', minHeight: '1.625em' }}>
                {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: 'var(--ink)' }} />}
              </span>
              <span className="flex-1 min-w-0">{prompt}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
