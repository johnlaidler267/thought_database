// Common language codes and their display names
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'cs', name: 'Czech' },
]

/**
 * Translate text using Google Translate's free API endpoint (browser-compatible)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'es', 'fr')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang = 'en') {
  if (!text || !text.trim()) {
    return text
  }

  // If target language is English, return original text
  if (targetLang === 'en') {
    return text
  }

  try {
    // Use Google Translate's free API endpoint
    // This is a public endpoint that doesn't require API keys
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`)
    }

    const data = await response.json()
    
    // The response structure is: [[["translated text", ...], ...], ...]
    if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      if (data[0][0] && Array.isArray(data[0][0]) && data[0][0][0]) {
        return data[0].map((item) => item[0]).join('')
      }
    }
    
    throw new Error('Unexpected response format from translation API')
  } catch (error) {
    console.error('Translation error:', error)
    throw new Error('Failed to translate text. Please try again.')
  }
}

/**
 * Detect the language of text
 * @param {string} text - Text to detect language for
 * @returns {Promise<string>} Language code
 */
export async function detectLanguage(text) {
  if (!text || !text.trim()) {
    return 'en'
  }

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return 'en'
    }

    const data = await response.json()
    return data[2] || 'en' // Language detection code is usually at index 2
  } catch (error) {
    console.error('Language detection error:', error)
    return 'en'
  }
}
