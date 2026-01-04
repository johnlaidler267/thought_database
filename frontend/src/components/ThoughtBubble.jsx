import { useState, useEffect, useRef } from 'react'
import CopyButton from './CopyButton'

export default function ThoughtBubble({ thought, onDelete }) {
  const [showRaw, setShowRaw] = useState(false)
  const buttonGroupRef = useRef(null)
  const viewRawBtnRef = useRef(null)
  const copyBtnRef = useRef(null)
  const deleteBtnRef = useRef(null)
  
  // #region agent log
  useEffect(() => {
    if (buttonGroupRef.current && viewRawBtnRef.current && copyBtnRef.current && deleteBtnRef.current) {
      const container = buttonGroupRef.current
      const viewRaw = viewRawBtnRef.current
      const copyWrapper = copyBtnRef.current
      const copyButton = copyWrapper.querySelector('button')
      const deleteBtn = deleteBtnRef.current
      
      const containerStyles = window.getComputedStyle(container)
      const viewRawStyles = window.getComputedStyle(viewRaw)
      const copyWrapperStyles = window.getComputedStyle(copyWrapper)
      const copyButtonStyles = copyButton ? window.getComputedStyle(copyButton) : null
      const deleteStyles = window.getComputedStyle(deleteBtn)
      
      const containerRect = container.getBoundingClientRect()
      const viewRawRect = viewRaw.getBoundingClientRect()
      const copyWrapperRect = copyWrapper.getBoundingClientRect()
      const deleteRect = deleteBtn.getBoundingClientRect()
      
      const spacing1 = copyWrapperRect.left - viewRawRect.right
      const spacing2 = deleteRect.left - copyWrapperRect.right
      
      fetch('http://127.0.0.1:7242/ingest/5b97fac4-1d2b-447f-88f0-c0ca912d0145',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThoughtBubble.jsx:useEffect',message:'Button spacing with space-x utility',data:{containerClasses:container.className,hasSpaceX:container.className.includes('space-x'),viewRawMarginRight:viewRawStyles.marginRight,viewRawMarginLeft:viewRawStyles.marginLeft,copyWrapperMarginRight:copyWrapperStyles.marginRight,copyWrapperMarginLeft:copyWrapperStyles.marginLeft,deleteMarginRight:deleteStyles.marginRight,deleteMarginLeft:deleteStyles.marginLeft,spacingViewRawToCopy:spacing1,spacingCopyToDelete:spacing2,viewRawRight:viewRawRect.right,copyWrapperLeft:copyWrapperRect.left,copyWrapperRight:copyWrapperRect.right,deleteLeft:deleteRect.left},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    }
  }, [showRaw])
  // #endregion
  
  const displayText = showRaw ? thought.raw_transcript : thought.cleaned_text
  const timestamp = new Date(thought.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="thought-bubble fade-in-up">
      {/* Tags */}
      {thought.tags && thought.tags.length > 0 && (
        <div className="mb-5">
          {thought.tags.map((tag, index) => (
            <span key={index} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div 
        className="thought-content mb-6 text-lg leading-relaxed text-white"
        aria-live="polite"
      >
        {displayText}
      </div>

      {/* Metadata and Actions */}
      <div className="flex items-center justify-between text-sm text-white/70">
        <span className="font-medium">{timestamp}</span>
        <div ref={buttonGroupRef} className="inline-flex items-center space-x-4 px-2 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <button
            ref={viewRawBtnRef}
            onClick={() => setShowRaw(!showRaw)}
            className="btn-secondary text-sm py-2 px-4"
            aria-label={showRaw ? 'View cleaned version' : 'View raw transcript'}
          >
            {showRaw ? 'View Cleaned' : 'View Raw'}
          </button>
          <div ref={copyBtnRef}>
            <CopyButton text={thought.cleaned_text} />
          </div>
          <button
            ref={deleteBtnRef}
            onClick={() => onDelete(thought.id)}
            className="btn-delete text-sm py-2 px-4"
            aria-label="Delete thought"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
