import { useState, useEffect } from 'react'
import { X, Pencil, Unlink } from 'lucide-react'
import { supabase } from '../services/supabase'

/**
 * Slide-in panel showing a person's profile: display name, clarifier, blurb, and all thoughts mentioning them.
 * Backdrop click closes; each thought is a condensed card; unlink removes the thought-person association.
 */
export default function PersonProfilePanel({
  personId,
  person,
  thoughts,
  onClose,
  onUnlink,
  onScrollToThought,
  onEditClarifier,
  onPersonUpdate,
}) {
  const [clarifierEdit, setClarifierEdit] = useState('')
  const [isEditingClarifier, setIsEditingClarifier] = useState(false)

  useEffect(() => {
    if (person) {
      setClarifierEdit(person.clarifier || '')
      setIsEditingClarifier(false)
    }
  }, [person?.id, person?.clarifier])

  // Fetch latest person data when panel opens (e.g. to get blurb after async sync)
  useEffect(() => {
    if (!personId || !supabase || !onPersonUpdate) return
    const fetchPerson = () => {
      supabase
        .from('people')
        .select('id, display_name, clarifier, blurb')
        .eq('id', personId)
        .single()
        .then(({ data }) => {
          if (data && data.blurb !== person?.blurb) {
            onPersonUpdate(personId, { blurb: data.blurb })
          }
        })
        .catch(() => {})
    }
    fetchPerson()
    const retryId = setTimeout(fetchPerson, 4000)
    return () => clearTimeout(retryId)
  }, [personId])

  if (!personId || !person) return null

  const displayName = person.display_name || 'Unknown'
  const hasClarifier = person.clarifier && String(person.clarifier).trim()
  const count = thoughts?.length ?? 0

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSaveClarifier = () => {
    onEditClarifier?.(personId, clarifierEdit.trim() || null)
    setIsEditingClarifier(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        aria-hidden
        onClick={handleBackdropClick}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md shadow-xl flex flex-col transition-transform duration-200 ease-out"
        style={{
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--stroke)',
        }}
        role="dialog"
        aria-labelledby="person-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--stroke)' }}>
          <div className="min-w-0 flex-1">
            <h2 id="person-panel-title" className="text-lg font-serif font-medium truncate" style={{ color: 'var(--ink)' }}>
              {displayName}
            </h2>
            {isEditingClarifier ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={clarifierEdit}
                  onChange={(e) => setClarifierEdit(e.target.value)}
                  placeholder="e.g. brother, K."
                  className="flex-1 min-w-0 px-2 py-1 text-sm font-serif border rounded"
                  style={{ borderColor: 'var(--stroke)', color: 'var(--ink)' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveClarifier()
                    if (e.key === 'Escape') {
                      setClarifierEdit(person.clarifier || '')
                      setIsEditingClarifier(false)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveClarifier}
                  className="text-xs font-serif px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--stroke)', color: 'var(--ink)' }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5">
                {hasClarifier ? (
                  <span className="text-xs font-serif" style={{ color: 'var(--muted-foreground)' }}>
                    {person.clarifier}
                  </span>
                ) : (
                  <span className="text-xs font-serif italic" style={{ color: 'var(--muted-foreground)' }}>
                    No note
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditingClarifier(true)}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label={hasClarifier ? 'Edit note' : 'Add note'}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-muted transition-colors shrink-0 ml-2"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--stroke)' }}>
            <h3 className="text-xs font-serif font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              About
            </h3>
            {person.blurb && String(person.blurb).trim() ? (
              <p className="text-sm font-serif leading-relaxed" style={{ color: 'var(--ink)' }}>
                {person.blurb}
              </p>
            ) : (
              <p className="text-sm font-serif italic" style={{ color: 'var(--muted-foreground)' }}>
                {thoughts?.length > 0
                  ? 'AI summary will appear here as you add more thoughts about this person.'
                  : 'Link thoughts to this person to generate an AI summary.'}
              </p>
            )}
          </div>
          <p className="text-xs font-serif mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Mentioned in {count} thought{count !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {(thoughts || []).map((thought) => {
              const text = thought.distilled_text || thought.distilledText || thought.cleaned_text || thought.raw_transcript || ''
              const preview = text.split('\n').slice(0, 3).join(' ').slice(0, 180)
              const date = thought.created_at
                ? new Date(thought.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : ''
              const tags = Array.isArray(thought.tags) ? thought.tags : []
              return (
                <div
                  key={thought.id}
                  className="group flex gap-2 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50"
                  style={{ borderColor: 'var(--stroke)' }}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      onClose()
                      onScrollToThought?.(thought.id)
                    }}
                  >
                    <p className="text-xs font-serif mb-1" style={{ color: 'var(--muted-foreground)' }}>
                      {date}
                    </p>
                    <p className="text-sm font-serif line-clamp-3 mb-2" style={{ color: 'var(--ink)' }}>
                      {preview || 'No content'}
                    </p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-serif px-1.5 py-0.5 rounded border"
                            style={{ borderColor: 'var(--stroke)', color: 'var(--muted-foreground)' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUnlink?.(thought.id, personId) }}
                    className="p-1.5 rounded shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-label="Unlink this thought from this person"
                    title="Unlink"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
