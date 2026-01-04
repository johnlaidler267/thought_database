import { useState } from 'react'

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-3 py-1.5 rounded-md border transition-colors font-serif touch-manipulation ${className}`}
      style={{
        color: 'var(--muted-foreground)',
        borderColor: 'var(--stroke)',
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ink)'
        e.currentTarget.style.borderColor = 'var(--ink)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--muted-foreground)'
        e.currentTarget.style.borderColor = 'var(--stroke)'
      }}
      aria-label="Copy to clipboard"
      aria-live="polite"
    >
      {copied ? (
        <span className="flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.6667 3.5L5.25 10L2.33333 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M6 2H3C2.44772 2 2 2.44772 2 3V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Copy
        </span>
      )}
    </button>
  )
}