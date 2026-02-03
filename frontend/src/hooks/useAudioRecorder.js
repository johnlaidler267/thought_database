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
      
      // Check if getUserMedia is available (required for mobile)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost'
          ? 'Audio recording requires HTTPS. Please use a secure connection.'
          : 'Audio recording is not supported in this browser. Please use a modern browser like Chrome, Safari, or Firefox.'
        setError(errorMsg)
        throw new Error(errorMsg)
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Try to use a supported mimeType, fallback to default
      let mimeType = 'audio/webm;codecs=opus'
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ]
      
          // Check which mimeType is supported
          for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type
              break
            }
          }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        // Some browsers emit empty dataavailable events (e.g. on requestData() with no new data); skip them.
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      // Request data periodically to ensure all chunks are captured
      // This is important for longer recordings
      const dataInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData()
        }
      }, 1000) // Request data every second
      
      // Store interval to clear it later
      mediaRecorder._dataInterval = dataInterval

      mediaRecorder.onstop = async () => {
        // Clear the data interval
        if (mediaRecorder._dataInterval) {
          clearInterval(mediaRecorder._dataInterval)
          mediaRecorder._dataInterval = null
        }
        
        // Request final data chunk - this ensures the WebM file is properly finalized
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.requestData()
        }
        
        // Wait longer to ensure final chunk is processed and WebM is finalized
        await new Promise(resolve => setTimeout(resolve, 500))
        
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      // Start with timeslice to ensure regular chunk emission
      mediaRecorder.start(1000) // Emit chunks every 1 second
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
            // Wait a bit for final chunk
            setTimeout(() => {
              const audioBlob = new Blob(audioChunksRef.current, {
                type: mediaRecorderRef.current?.mimeType || 'audio/webm;codecs=opus',
              })
              onAutoStopRef.current(audioBlob)
            }, 300)
          }
        }
      }, MAX_RECORDING_DURATION)
    } catch (err) {
      // Provide mobile-friendly error messages
      let errorMessage = 'Failed to access microphone.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and try again.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use by another app. Please close other apps using the microphone and try again.'
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Microphone settings not supported. Please try a different browser.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
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

      // Request final data before stopping to ensure all audio is captured
      mediaRecorderRef.current.requestData()
      
      mediaRecorderRef.current.onstop = async () => {
        // Clear the data interval if it exists
        if (mediaRecorderRef.current._dataInterval) {
          clearInterval(mediaRecorderRef.current._dataInterval)
          mediaRecorderRef.current._dataInterval = null
        }
        
        // Request final data chunk one more time
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.requestData()
        }
        
        // Wait longer to ensure all chunks are received and WebM container is fully finalized
        // MediaRecorder needs time to write the final WebM metadata
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0)
        const audioDataChunks = audioChunksRef.current.filter(chunk => chunk.size > 100)
        const audioDataSize = audioDataChunks.reduce((sum, chunk) => sum + chunk.size, 0)
        
        if (totalSize === 0) {
          console.error('[RECORDING] No audio data captured!')
          reject(new Error('No audio data captured. Please try recording again.'))
          return
        }
        
        if (audioDataSize < 1000) {
          console.warn(`[RECORDING] Very small audio data size: ${audioDataSize} bytes. Recording might be too short.`)
        }
        
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm;codecs=opus',
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
