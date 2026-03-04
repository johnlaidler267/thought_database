import { useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import ThoughtBubble from './ThoughtBubble'

const ROW_ESTIMATE = 220
const LOAD_MORE_THRESHOLD = 400

export default function ThoughtTimeline({
  scrollContainerRef,
  thoughts,
  onDelete,
  suggestedTagsByThoughtId = {},
  onConfirmSuggestedTag,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}) {
  const rowVirtualizer = useVirtualizer({
    count: thoughts.length,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 5,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // When user scrolls near bottom of the container, load next page
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return
    const el = scrollContainerRef?.current
    if (!el) return

    const check = () => {
      const { scrollTop, clientHeight, scrollHeight } = el
      if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD) {
        onLoadMore()
      }
    }

    check()
    el.addEventListener('scroll', check, { passive: true })
    return () => el.removeEventListener('scroll', check)
  }, [onLoadMore, hasMore, loadingMore, scrollContainerRef])

  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/70">
        <p className="font-sans">No thoughts yet. Start recording to capture your first thought.</p>
      </div>
    )
  }

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const thought = thoughts[virtualRow.index]
        if (!thought) return null
        return (
          <div
            key={thought.id}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ThoughtBubble
              thought={thought}
              onDelete={onDelete}
              suggestedTags={suggestedTagsByThoughtId[thought.id] || []}
              onConfirmSuggestedTag={onConfirmSuggestedTag}
            />
          </div>
        )
      })}
      {loadingMore && (
        <div
          className="flex items-center justify-center py-4 text-white/60 text-sm"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: rowVirtualizer.getTotalSize(),
          }}
        >
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" aria-hidden />
          Loading more…
        </div>
      )}
    </div>
  )
}
