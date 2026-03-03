import { X, Plus } from 'lucide-react'
import { categoryTabsContainer } from './styles'

export function CategoryTabs({
  categories,
  activeCategory,
  onActiveCategoryChange,
  isAddingCategory,
  newCategoryName,
  onNewCategoryNameChange,
  onAddCategory,
  onStartAddCategory,
  onCancelAddCategory,
  onDeleteCategory,
}) {
  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') onAddCategory()
    if (e.key === 'Escape') {
      onCancelAddCategory()
    }
  }

  return (
    <div
      className="border-b border-stroke px-4 sm:px-6 py-3 overflow-x-auto category-tabs-container"
      style={categoryTabsContainer}
    >
      <div
        className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div
          className="flex items-center gap-2 flex-nowrap"
          style={{ width: 'max-content', minWidth: 'max-content' }}
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onActiveCategoryChange(category)}
              className={`px-4 py-2 rounded font-serif text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                activeCategory === category
                  ? 'text-paper'
                  : 'border text-muted-foreground hover:text-ink hover:border-ink'
              }`}
              style={{
                backgroundColor: activeCategory === category ? 'var(--ink)' : 'var(--card)',
                borderColor: activeCategory === category ? 'transparent' : 'var(--stroke)',
                color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                paddingLeft: '1rem',
                paddingRight: category !== 'All' ? '0.75rem' : '1rem',
                minHeight: '2.5rem',
                height: '2.5rem',
                minWidth: 'fit-content',
              }}
            >
              <span className="flex-shrink-0">{category}</span>
              {category !== 'All' && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteCategory(category)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onDeleteCategory(category)
                    }
                  }}
                  className="transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{
                    color: activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)',
                    width: '1rem',
                    height: '1rem',
                    minWidth: '1rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--destructive)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color =
                      activeCategory === category ? 'var(--paper)' : 'var(--muted-foreground)'
                  }}
                  aria-label={`Delete ${category} category`}
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}

          {isAddingCategory ? (
            <div className="relative flex-shrink-0">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => onNewCategoryNameChange(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Category name..."
                className="px-4 py-2 pr-10 rounded border border-stroke bg-card font-serif focus:outline-none focus:border-ink w-40"
                style={{ height: '2.5rem', minHeight: '2.5rem' }}
                autoFocus
              />
              <button
                type="button"
                onClick={onAddCategory}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-muted-foreground transition-colors"
                aria-label="Add category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartAddCategory}
              className="px-3 py-2 rounded border border-dashed transition-colors flex items-center gap-2 font-serif text-sm flex-shrink-0 whitespace-nowrap"
              style={{
                borderColor: 'var(--stroke)',
                color: 'var(--muted-foreground)',
                minHeight: '2.5rem',
                height: '2.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.borderColor = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.borderColor = 'var(--stroke)'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
