import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Delete",
  cancelText = "Cancel"
}) {
  const cancelButtonRef = useRef(null)

  // Handle Escape key to close and focus management
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    
    // Focus cancel button when dialog opens
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }

    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg shadow-lg max-w-md w-full"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--stroke)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--stroke)' }}
        >
          <div className="flex items-center justify-between">
            <h3 
              className="text-lg font-serif"
              style={{ color: 'var(--ink)' }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{ 
                color: 'var(--muted-foreground)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p 
            className="text-base font-serif leading-relaxed"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: 'var(--stroke)' }}
        >
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="px-4 py-2 rounded font-serif text-sm transition-colors"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--stroke)',
              color: 'var(--ink)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--muted)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded font-serif text-sm transition-colors"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'var(--paper)',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
