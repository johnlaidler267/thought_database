import { User } from 'lucide-react'
import { headerStyle } from './styles'

export function HomePageHeader({
  isDark,
  isAudioRecording,
  showWarning,
  onProfileClick,
  user,
}) {
  const statusColor = isAudioRecording
    ? showWarning
      ? '#ff3b30'
      : 'var(--ink)'
    : 'var(--muted-foreground)'
  const statusLabel = isAudioRecording ? 'Recording' : 'Ready'

  return (
    <header
      className="border-b border-stroke px-4 sm:px-6 py-3 sm:py-4"
      style={headerStyle}
    >
      <div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-[46.2rem] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={isDark ? '/logo-dark.png' : '/logo.png'}
            alt=""
            className="h-6 w-6 object-contain"
            aria-hidden
          />
          <h1 className="text-lg font-serif tracking-wide" style={{ color: 'var(--ink)' }}>
            Vellum
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-serif">
          <span className="text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
            Status:
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isAudioRecording ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: statusColor,
              }}
            />
            <span
              className={`uppercase tracking-wider ${showWarning ? 'font-medium' : ''}`}
              style={{ color: showWarning ? '#ff3b30' : 'var(--ink)' }}
            >
              {statusLabel}
            </span>
          </div>
          {user && (
            <button
              type="button"
              onClick={onProfileClick}
              className="text-muted-foreground hover:text-ink transition-colors rounded-full flex items-center justify-center"
              style={{
                color: 'var(--muted-foreground)',
                width: '2rem',
                height: '2rem',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
                e.currentTarget.style.backgroundColor = 'var(--muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              aria-label="Account settings"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
