import { useState, useEffect, useRef } from 'react'

export default function EditableTitle() {
  const [title, setTitle] = useState(() => {
    const saved = localStorage.getItem('thoughtNotaryTitle')
    return saved || 'Thought Notary'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('thoughtNotaryTitle', title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown])

  const handleBubbleClick = () => {
    if (!isEditing) {
      setShowDropdown(!showDropdown)
    }
  }

  const handleRenameClick = () => {
    setShowDropdown(false)
    setIsEditing(true)
  }

  const handleTitleBlur = () => {
    setIsEditing(false)
    if (title.trim() === '') {
      setTitle('Thought Notary')
    }
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      setTitle(localStorage.getItem('thoughtNotaryTitle') || 'Thought Notary')
      e.target.blur()
    }
  }

  return (
    <div className="flex justify-center py-6 px-8">
      <div className="relative mx-2" ref={dropdownRef}>
        {/* Title Bubble */}
        <div
          onClick={handleBubbleClick}
          className={`
            inline-flex items-center gap-3 px-6 py-3 rounded-3xl border-radius-[2rem]
            bg-white/5 border border-white/10
            cursor-pointer transition-all duration-200
            hover:bg-white/8 hover:border-white/15
            ${showDropdown ? 'bg-white/8 border-white/15' : ''}
            ${isEditing ? 'cursor-text' : ''}
          `}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-2xl font-semibold tracking-tight text-white bg-transparent border-none outline-none focus:ring-0 focus:outline-none flex-1 min-w-[200px]"
              style={{ 
                fontFamily: 'inherit',
                fontSize: '1.5rem',
                lineHeight: '1.75rem'
              }}
            />
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`text-white/60 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </div>

        {/* Dropdown Menu */}
        {showDropdown && !isEditing && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 min-w-[160px]">
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={handleRenameClick}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors duration-150 text-sm font-medium flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8.75 1.75L12.25 5.25M10.5 2.625L11.375 3.5C11.7188 3.84375 11.7188 4.40625 11.375 4.75L6.125 10C5.96875 10.1562 5.75 10.25 5.5 10.25H2.75V7.5C2.75 7.25 2.84375 7.03125 3 6.875L8.25 1.625C8.59375 1.28125 9.15625 1.28125 9.5 1.625L10.5 2.625Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Rename
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
