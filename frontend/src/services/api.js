const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  try {
    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Transcription failed')
    }

    return response.json()
  } catch (err) {
    if (err.message) {
      throw err
    }
    throw new Error('Failed to connect to transcription service. Please check your backend is running.')
  }
}

export async function cleanTranscript(rawTranscript) {
  try {
    const response = await fetch(`${API_URL}/clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: rawTranscript }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Cleaning failed')
    }

    const data = await response.json()
    return data.cleaned_text
  } catch (err) {
    if (err.message) {
      throw err
    }
    throw new Error('Failed to connect to cleaning service.')
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

