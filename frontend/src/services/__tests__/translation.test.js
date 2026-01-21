import { describe, it, expect, vi, beforeEach } from 'vitest'
import { translateText, detectLanguage, LANGUAGES } from '../translation'

describe('Translation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return original text if target language is English', async () => {
    const text = 'Hello world'
    const result = await translateText(text, 'en')
    expect(result).toBe(text)
  })

  it('should return original text if text is empty', async () => {
    const result = await translateText('', 'es')
    expect(result).toBe('')
  })

  it('should translate text to Spanish', async () => {
    // Mock fetch for Google Translate API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[[['Hola mundo', null, null, 0]]], null, 'en']
    })

    const result = await translateText('Hello world', 'es')
    expect(result).toBeTruthy()
    expect(result).toBe('Hola mundo')
    expect(global.fetch).toHaveBeenCalled()
  })

  it('should handle translation errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(translateText('Hello', 'es')).rejects.toThrow()
  })

  it('should have valid language codes', () => {
    LANGUAGES.forEach(lang => {
      expect(lang.code).toBeTruthy()
      expect(lang.name).toBeTruthy()
      expect(typeof lang.code).toBe('string')
      expect(typeof lang.name).toBe('string')
    })
  })
})
