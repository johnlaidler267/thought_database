// Construct API URL - ensure it ends with /api
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Add /api if not already present
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}
const API_URL = getApiUrl()

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  // Timeout for transcription (5 minutes for long recordings)
  const TRANSCRIPTION_TIMEOUT_MS = 5 * 60 * 1000

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS)

    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Transcription failed`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (!data.transcript) {
        throw new Error('No transcript returned from server')
      }
      return data
    } catch (err) {
      clearTimeout(timeoutId)
      
      // Handle timeout
      if (err.name === 'AbortError') {
        throw new Error('Transcription timed out. Please try recording a shorter segment.')
      }
      throw err
    }
  } catch (err) {
    // Re-throw if it's already an Error with a message
    if (err instanceof Error && err.message) {
      throw err
    }
    // Handle network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Failed to connect to backend. Please ensure the server is running on ' + API_URL)
    }
    throw new Error('Failed to transcribe audio: ' + (err.message || 'Unknown error'))
  }
}

export async function cleanTranscript(rawTranscript) {
  // Timeout for LLM cleanup (30 seconds)
  const CLEANUP_TIMEOUT_MS = 30000

  console.log('🧹 Frontend: Starting cleanTranscript')
  console.log('🧹 Frontend: API_URL =', API_URL)
  console.log('🧹 Frontend: Transcript to clean:', rawTranscript.substring(0, 50) + '...')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CLEANUP_TIMEOUT_MS)

    try {
      const cleanUrl = `${API_URL}/clean`
      console.log('🧹 Frontend: Calling', cleanUrl)
      
      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: rawTranscript }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('🧹 Frontend: Response status', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.warn('🧹 Frontend: Cleanup failed, using original transcript:', errorData.error)
        return rawTranscript
      }

      const data = await response.json()
      console.log('🧹 Frontend: Response data:', data)
      console.log('🧹 Frontend: Cleaned text:', data.cleaned_text)
      console.log('🧹 Frontend: Same as original?', data.cleaned_text === rawTranscript)
      
      // Log additional metadata if available
      if (data.cleaned !== undefined) {
        console.log('🧹 Frontend: Cleaning actually ran?', data.cleaned)
      }
      if (data.reason) {
        console.warn('🧹 Frontend: Backend reason:', data.reason)
      }
      if (data.error) {
        console.error('🧹 Frontend: Backend error:', data.error)
      }
      if (data.original_length && data.cleaned_length) {
        console.log('🧹 Frontend: Lengths - Original:', data.original_length, 'Cleaned:', data.cleaned_length)
      }
      
      return data.cleaned_text || rawTranscript
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('🧹 Frontend: Cleanup fetch error:', err)
      
      // Handle timeout gracefully - return original transcript
      if (err.name === 'AbortError') {
        console.warn('🧹 Frontend: Cleanup timed out, using original transcript')
        return rawTranscript
      }
      throw err
    }
  } catch (err) {
    console.error('🧹 Frontend: Cleanup outer catch:', err)
    // On any error, return original transcript instead of failing
    // This ensures graceful degradation
    if (err.message) {
      console.warn('🧹 Frontend: Cleanup error, using original transcript:', err.message)
      return rawTranscript
    }
    console.warn('🧹 Frontend: Cleanup service unavailable, using original transcript')
    return rawTranscript
  }
}

export async function extractTags(cleanedText) {
  try {
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: cleanedText }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Tag extraction failed')
    }

    const data = await response.json()
    return data.tags || []
  } catch (err) {
    if (err.message) {
      throw err
    }
    throw new Error('Failed to connect to tag extraction service.')
  }
}

