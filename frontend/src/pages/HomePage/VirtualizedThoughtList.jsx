import { useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const ROW_ESTIMATE = 280
const LOAD_MORE_THRESHOLD = 400

export function VirtualizedThoughtList({
  scrollContainerRef,
  thoughts,
  hasMore,
  loadingMore,
  onLoadMore,
  renderCard,
}) {
  const rowVirtualizer = useVirtualizer({
    count: thoughts.length,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 4,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

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

  if (!thoughts.length) return null

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
            {renderCard(thought)}
          </div>
        )
      })}
      {loadingMore && (
        <div
          className="flex items-center justify-center py-4 text-sm"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: rowVirtualizer.getTotalSize(),
            color: 'var(--muted-foreground)',
          }}
        >
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" aria-hidden />
          Loading more…
        </div>
      )}
    </div>
  )
}
