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

  const startRecording = useCallback(async () => {
    try {
      setError(null)
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

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus',
        })
        setIsRecording(false)
        resolve(audioBlob)
      }

      mediaRecorderRef.current.stop()
    })
  }, [isRecording])

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  }
}

