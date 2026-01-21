import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudioRecorder } from '../useAudioRecorder'

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
  })

  it('should stop recording and return audio blob', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    let audioBlob
    await act(async () => {
      audioBlob = await result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(audioBlob).toBeInstanceOf(Blob)
  })

  it('should show countdown timer when recording', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(result.current.remainingTime).toBeLessThan(300000) // Less than 5 minutes
    })
  })

  it('should show warning at 4 minutes', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    // Fast-forward to 4 minutes
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000)
    })

    await waitFor(() => {
      expect(result.current.showWarning).toBe(true)
    })
  })

  it('should auto-stop at 5 minutes', async () => {
    vi.useFakeTimers()
    const onAutoStop = vi.fn()
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      result.current.setOnAutoStop(onAutoStop)
      await result.current.startRecording()
    })

    // Fast-forward to 5 minutes
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })

    await waitFor(() => {
      expect(result.current.isRecording).toBe(false)
      expect(onAutoStop).toHaveBeenCalled()
    })
  })

  it('should format remaining time correctly', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    // Fast-forward to 4:30 remaining
    act(() => {
      vi.advanceTimersByTime(30 * 1000)
    })

    await waitFor(() => {
      const formatted = result.current.formatRemainingTime()
      expect(formatted).toMatch(/\d+:\d{2}/) // Format: M:SS
    })
  })
})
