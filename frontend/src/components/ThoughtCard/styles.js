/**
 * Shared style objects and class name constants for ThoughtCard and sub-components.
 * Uses CSS variables for theming; no behavior changes.
 */

export const card = {
  borderColor: 'var(--stroke)',
  backgroundColor: 'var(--card)',
}

export const cardBaseClass = 'border-stroke bg-card hover:bg-muted/30 transition-colors duration-200 pt-6 px-6 shadow-none relative'

export const mutedFg = { color: 'var(--muted-foreground)' }
export const ink = { color: 'var(--ink)' }
export const stroke = { backgroundColor: 'var(--stroke)' }

export const savingOverlay = {
  backgroundColor: 'var(--card)',
  opacity: 0.92,
}

export const menuDropdown = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--stroke)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
}

export const menuItemHover = (e, over) => {
  e.currentTarget.style.backgroundColor = over ? 'var(--muted)' : 'transparent'
}

export const iconButtonMuted = (e, over) => {
  e.currentTarget.style.color = over ? 'var(--ink)' : 'var(--muted-foreground)'
}

export const respondingToBubble = {
  borderColor: 'var(--stroke)',
  backgroundColor: 'var(--muted)',
  color: 'var(--muted-foreground)',
}

export const editTextarea = {
  color: 'var(--ink)',
  backgroundColor: '#fafafa',
  border: '1px solid rgba(0,0,0,0.08)',
  transition: 'border-color 0.15s ease',
}

export const editTextareaFocus = (e, focused) => {
  e.currentTarget.style.borderColor = focused ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'
}

export const tagButton = {
  borderColor: 'var(--stroke)',
  color: 'var(--muted-foreground)',
}

export const tagChip = {
  borderColor: 'var(--stroke)',
  backgroundColor: 'var(--muted)',
  color: 'var(--muted-foreground)',
}

export const bannerRow = {
  backgroundColor: '#f5f5f5',
  padding: '8px 12px',
  borderRadius: 8,
  color: 'var(--muted-foreground)',
}

export const bannerButtonPrimary = {
  borderColor: 'var(--stroke)',
  color: 'var(--ink)',
  backgroundColor: 'var(--card)',
}

export const bannerButtonSecondary = {
  borderColor: 'var(--stroke)',
  color: 'var(--muted-foreground)',
  backgroundColor: 'transparent',
}

export const followUpBubble = {
  borderLeftColor: 'var(--stroke)',
  backgroundColor: 'var(--muted)',
  color: 'var(--ink)',
}

export const followUpAiPrompt = {
  color: 'var(--muted-foreground)',
  borderLeftColor: 'rgba(100, 116, 139, 0.65)',
  backgroundColor: 'rgba(100, 116, 139, 0.1)',
}

export const followUpInputWrap = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--stroke)',
  color: 'var(--ink)',
}

export const actionButtonMuted = (e, over) => {
  if (over && !e.currentTarget.disabled) {
    e.currentTarget.style.color = 'var(--ink)'
    e.currentTarget.style.backgroundColor = 'var(--muted)'
  } else {
    e.currentTarget.style.color = 'var(--muted-foreground)'
    e.currentTarget.style.backgroundColor = 'transparent'
  }
}

export const copyToast = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--stroke)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  animation: 'fadeInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
}
