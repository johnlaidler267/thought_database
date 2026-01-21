import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_RECORDING_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const WARNING_THRESHOLD = 4 * 60 * 1000 // 4 minutes - show warning

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const [remainingTime, setRemainingTime] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const onAutoStopRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setShowWarning(false)
      setRemainingTime(MAX_RECORDING_DURATION)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, MAX_RECORDING_DURATION - elapsed)
        setRemainingTime(remaining)

        // Show warning at 4 minutes
        if (elapsed >= WARNING_THRESHOLD && elapsed < MAX_RECORDING_DURATION) {
          setShowWarning(true)
        }

        // Stop countdown when time is up
        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
        }
      }, 100) // Update every 100ms for smooth countdown

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          setIsRecording(false)
          setRemainingTime(0)
          setShowWarning(false)
          
          // Clear intervals
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }

          // Trigger auto-submit callback if provided
          if (onAutoStopRef.current) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: 'audio/webm;codecs=opus',
            })
            onAutoStopRef.current(audioBlob)
          }
        }
      }, MAX_RECORDING_DURATION)
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.')
      console.error('Recording error:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('Not recording'))
        return
      }

      // Clear timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus',
        })
        setIsRecording(false)
        setRemainingTime(null)
        setShowWarning(false)
        resolve(audioBlob)
      }

      mediaRecorderRef.current.stop()
    })
  }, [isRecording])

  // Set callback for auto-stop
  const setOnAutoStop = useCallback((callback) => {
    onAutoStopRef.current = callback
  }, [])

  // Format remaining time as MM:SS
  const formatRemainingTime = useCallback(() => {
    if (remainingTime === null) return null
    const totalSeconds = Math.ceil(remainingTime / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [remainingTime])

  return {
    isRecording,
    error,
    remainingTime,
    showWarning,
    formatRemainingTime,
    startRecording,
    stopRecording,
    setOnAutoStop,
  }
}
