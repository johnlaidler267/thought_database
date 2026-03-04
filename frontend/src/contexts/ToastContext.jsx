import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const AUTO_DISMISS_MS = 6000

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  const [key, setKey] = useState(0)

  const showError = useCallback((msg) => {
    setMessage(String(msg))
    setKey((k) => k + 1)
  }, [])

  const dismiss = useCallback(() => setMessage(null), [])

  useEffect(() => {
    if (!message) return
    const id = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [message, key, dismiss])

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      {message && (
        <div
          key={key}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[min(90vw,28rem)]"
          style={{ animation: 'toastFadeIn 0.2s ease-out' }}
          role="alert"
          aria-live="assertive"
        >
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'rgba(220, 38, 38, 0.4)',
              borderLeftWidth: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--error, #b91c1c)' }} aria-hidden />
            <p className="flex-1 text-sm font-serif leading-snug" style={{ color: 'var(--ink)' }}>
              {message}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
