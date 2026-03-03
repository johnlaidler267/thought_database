import { editTextarea, editTextareaFocus } from './styles'

export function EditModeBlock({
  value,
  onChange,
  onInput,
  disabled,
  textareaRef,
  onFocus,
  onBlur,
  onSave,
  onCancel,
  isSaving,
}) {
  const handleFocus = (e) => {
    editTextareaFocus(e, true)
    onFocus?.(e)
  }
  const handleBlur = (e) => {
    editTextareaFocus(e, false)
    onBlur?.(e)
  }

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onInput={onInput}
        disabled={disabled}
        className="block w-full min-w-0 text-sm sm:text-base leading-relaxed font-serif text-pretty mb-3 resize-none overflow-hidden px-3 py-2 rounded-lg focus:outline-none focus:ring-0"
        style={editTextarea}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Edit thought text..."
        aria-label="Edit displayed thought text"
      />
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !value.trim()}
          className="text-sm font-serif py-0.5 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--ink)' }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="text-sm font-serif py-0.5 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Cancel
        </button>
      </div>
    </>
  )
}
