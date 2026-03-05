import { useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const ROW_ESTIMATE = 280
const LOAD_MORE_THRESHOLD_PX = 400

export function VirtualizedThoughtList({
  scrollContainerRef,
  scrollContainerEl,
  thoughts,
  hasMore,
  loadingMore,
  onLoadMore,
  renderCard,
}) {
  const loadMoreSentinelRef = useRef(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  const rowVirtualizer = useVirtualizer({
    count: thoughts.length,
    getScrollElement: () => scrollContainerRef?.current ?? scrollContainerEl ?? null,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 4,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // Scroll listener: when user scrolls near bottom, load more (works regardless of IntersectionObserver)
  const checkNearBottom = useCallback(() => {
    if (!onLoadMoreRef.current || !hasMore || loadingMore) return
    const el = scrollContainerEl ?? scrollContainerRef?.current
    if (!el) return
    const { scrollTop, clientHeight, scrollHeight } = el
    if (scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) {
      onLoadMoreRef.current()
    }
  }, [hasMore, loadingMore, scrollContainerEl, scrollContainerRef])

  useEffect(() => {
    const el = scrollContainerEl ?? scrollContainerRef?.current
    if (!el) return
    checkNearBottom()
    el.addEventListener('scroll', checkNearBottom, { passive: true })
    return () => el.removeEventListener('scroll', checkNearBottom)
  }, [scrollContainerEl, scrollContainerRef, checkNearBottom])

  // IntersectionObserver as backup when sentinel enters view
  useEffect(() => {
    if (!onLoadMoreRef.current || !hasMore || loadingMore) return
    const scrollEl = scrollContainerEl ?? scrollContainerRef?.current
    const sentinel = loadMoreSentinelRef.current
    if (!scrollEl || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [e] = entries
        if (e?.isIntersecting && !loadingMore) onLoadMoreRef.current?.()
      },
      { root: scrollEl, rootMargin: '300px 0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, scrollContainerEl, scrollContainerRef, thoughts.length])

  if (!thoughts.length) return null

  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <div
      style={{
        height: `${totalSize}px`,
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
      {hasMore && (
        <div
          ref={loadMoreSentinelRef}
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: totalSize,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      )}
      {hasMore && (
        <div
          className="flex items-center justify-center py-6"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: totalSize,
            color: 'var(--muted-foreground)',
          }}
        >
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
              Loading more…
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onLoadMore?.()}
              className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
