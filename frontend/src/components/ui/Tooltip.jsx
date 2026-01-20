import { useState, useRef, useEffect } from 'react'

export default function Tooltip({ children, text, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      let top = 0
      let left = 0

      if (position === 'top') {
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
      } else if (position === 'bottom') {
        top = triggerRect.bottom + 8
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
      } else if (position === 'left') {
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)
        left = triggerRect.left - tooltipRect.width - 8
      } else if (position === 'right') {
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)
        left = triggerRect.right + 8
      }

      // Keep tooltip within viewport
      const padding = 8
      if (left < padding) left = padding
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding
      }
      if (top < padding) top = padding
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding
      }

      setTooltipPosition({ top, left })
    }
  }, [isVisible, position])

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 300) // Small delay before showing tooltip
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none transition-opacity duration-150"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            opacity: isVisible ? 1 : 0,
            animation: 'fadeInUp 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="px-2.5 py-1 rounded-md font-serif text-xs whitespace-nowrap"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--stroke)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              letterSpacing: '0.01em',
            }}
          >
            {text}
          </div>
        </div>
      )}
    </>
  )
}
