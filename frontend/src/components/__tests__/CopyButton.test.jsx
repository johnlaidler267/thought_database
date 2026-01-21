import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CopyButton from '../CopyButton'

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders copy button', () => {
    render(<CopyButton text="Test text" />)
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument()
  })

  it('copies text to clipboard on click', async () => {
    const user = userEvent.setup()
    const text = 'Test text to copy'
    
    render(<CopyButton text={text} />)
    
    const button = screen.getByLabelText('Copy to clipboard')
    await user.click(button)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
    })
  })

  it('shows "Copied!" message after copying', async () => {
    const user = userEvent.setup()
    
    render(<CopyButton text="Test" />)
    
    const button = screen.getByLabelText('Copy to clipboard')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('resets to copy state after 2 seconds', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup()
    
    render(<CopyButton text="Test" />)
    
    const button = screen.getByLabelText('Copy to clipboard')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
    
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    })
    
    vi.useRealTimers()
  })

  it('handles clipboard errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'))
    
    render(<CopyButton text="Test" />)
    
    const button = screen.getByLabelText('Copy to clipboard')
    await user.click(button)
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
    })
    
    consoleError.mockRestore()
  })
})
