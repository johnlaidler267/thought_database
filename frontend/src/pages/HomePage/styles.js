/**
 * Shared style objects for HomePage and sub-components.
 */

export const pageBackground = {
  backgroundColor: 'var(--paper)',
  backgroundImage: [
    'radial-gradient(ellipse 680px 380px at 5% 22%, rgba(0,0,0,0.03), transparent 55%)',
    'radial-gradient(ellipse 560px 400px at 96% 35%, rgba(0,0,0,0.025), transparent 58%)',
    'radial-gradient(ellipse 720px 420px at 42% 72%, rgba(0,0,0,0.02), transparent 65%)',
  ].join(', '),
}

export const headerStyle = {
  borderColor: 'var(--stroke)',
  backgroundColor: 'var(--paper)',
  backgroundImage: [
    'radial-gradient(ellipse 520px 280px at 8% 12%, rgba(0,0,0,0.03), transparent 65%)',
    'radial-gradient(ellipse 480px 320px at 94% 18%, rgba(0,0,0,0.025), transparent 60%)',
    'radial-gradient(ellipse 600px 360px at 58% 45%, rgba(0,0,0,0.02), transparent 70%)',
  ].join(', '),
}

export const searchBarBorder = { borderColor: 'var(--stroke)' }
export const searchInputWrap = { backgroundColor: 'var(--card)' }
export const tagChipStyle = { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
export const sortButtonStyle = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--stroke)',
  color: 'var(--muted-foreground)',
}
export const sortMenuStyle = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--stroke)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
}
export const categoryTabsContainer = {
  borderColor: 'var(--stroke)',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}
export const errorBannerStyle = {
  background: 'rgba(239, 68, 68, 0.1)',
  borderColor: 'rgba(239, 68, 68, 0.3)',
  color: 'var(--ink)',
}
export const loadingBannerStyle = {
  background: 'var(--muted)',
  borderColor: 'var(--stroke)',
  color: 'var(--ink)',
}
export const transcriptEditorOverlay = {
  borderColor: 'var(--stroke)',
  backgroundColor: 'var(--paper)',
  boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
}
export const remainingTimeBadge = {
  color: 'var(--ink)',
  backgroundColor: 'var(--card)',
  border: '1px solid var(--stroke)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
}
