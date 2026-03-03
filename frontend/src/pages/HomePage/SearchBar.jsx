import { Search, X, ArrowUpDown } from 'lucide-react'
import Tooltip from '../../components/ui/Tooltip'
import {
  searchBarBorder,
  searchInputWrap,
  tagChipStyle,
  sortButtonStyle,
  sortMenuStyle,
} from './styles'

export function SearchBar({
  searchQuery,
  onSearchQueryChange,
  activeTags,
  onTagClick,
  onClearSearchAndTags,
  sortMenuRef,
  sortOrder,
  sortMenuOpen,
  onSortMenuToggle,
  onSortOrderChange,
}) {
  const handleClearClick = () => {
    onClearSearchAndTags()
  }

  const handleSortDesc = () => {
    onSortOrderChange('desc')
    onSortMenuToggle(false)
  }

  const handleSortAsc = () => {
    onSortOrderChange('asc')
    onSortMenuToggle(false)
  }

  return (
    <div className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4" style={searchBarBorder}>
      <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div
            className="flex flex-wrap items-center gap-2 rounded border border-stroke py-2 pl-10 pr-10 font-serif transition-colors focus-within:border-ink"
            style={searchInputWrap}
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--muted-foreground)' }}
            />
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-sm font-serif text-xs leading-tight shrink-0 py-0.5 px-2"
                style={tagChipStyle}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="p-0 min-w-0 min-h-0 inline-flex items-center justify-center rounded-sm transition-colors hover:opacity-70"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--muted-foreground)'
                  }}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-2.5 h-2.5" strokeWidth={2} />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={
                activeTags.length > 0 ? 'Add more tags or type to search...' : 'Search or click a tag...'
              }
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="flex-1 min-w-[8rem] py-0.5 bg-transparent border-0 font-serif placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              style={{ color: 'var(--ink)', fontSize: '16px' }}
            />
            {(searchQuery || activeTags.length > 0) && (
              <button
                type="button"
                onClick={handleClearClick}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }}
                aria-label="Clear search and tags"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="relative flex-shrink-0" ref={sortMenuRef}>
          <Tooltip text="Sort" position="bottom">
            <button
              type="button"
              onClick={() => onSortMenuToggle(!sortMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded border font-serif transition-colors"
              style={sortButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--ink)'
                e.currentTarget.style.color = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--stroke)'
                e.currentTarget.style.color = 'var(--muted-foreground)'
              }}
              aria-label="Sort"
              aria-expanded={sortMenuOpen}
            >
              <ArrowUpDown className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </Tooltip>
          {sortMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-md border shadow-lg z-20 py-1"
              style={sortMenuStyle}
            >
              <button
                type="button"
                onClick={handleSortDesc}
                className="w-full text-left px-3 py-2 text-sm font-serif transition-colors"
                style={{
                  color: sortOrder === 'desc' ? 'var(--ink)' : 'var(--muted-foreground)',
                  backgroundColor: sortOrder === 'desc' ? 'var(--muted)' : 'transparent',
                }}
              >
                Date (newest first)
              </button>
              <button
                type="button"
                onClick={handleSortAsc}
                className="w-full text-left px-3 py-2 text-sm font-serif transition-colors"
                style={{
                  color: sortOrder === 'asc' ? 'var(--ink)' : 'var(--muted-foreground)',
                  backgroundColor: sortOrder === 'asc' ? 'var(--muted)' : 'transparent',
                }}
              >
                Date (oldest first)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
