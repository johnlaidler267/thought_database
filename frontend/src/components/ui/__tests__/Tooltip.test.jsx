import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tooltip from '../Tooltip'

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children', () => {
    render(
      <Tooltip text="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip after delay on hover', async () => {
    const user = userEvent.setup({ delay: null })
    
    render(
      <Tooltip text="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    
    const button = screen.getByText('Hover me')
    await user.hover(button)
    
    // Fast-forward past delay
    vi.advanceTimersByTime(300)
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument()
    })
  })

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup({ delay: null })
    
    render(
      <Tooltip text="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    
    const button = screen.getByText('Hover me')
    await user.hover(button)
    
    vi.advanceTimersByTime(300)
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument()
    })
    
    await user.unhover(button)
    
    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
    })
  })
})
