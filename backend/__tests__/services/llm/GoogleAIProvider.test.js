import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleAIProvider } from '../../../services/llm/providers/GoogleAIProvider.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('GoogleAIProvider', () => {
  let provider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new GoogleAIProvider({
      apiKey: 'test-google-key',
      timeout: 10000
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('complete', () => {
    it('should complete prompt successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'Generated response from Gemini'
              }]
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await provider.complete('Test prompt', 'gemini-2.0-flash')

      expect(result).toBe('Generated response from Gemini')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.0-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test prompt')
        })
      )
    })

    it('should use default model if not specified', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'Response'
              }]
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await provider.complete('Test prompt')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.0-flash:generateContent'),
        expect.anything()
      )
    })

    it('should pass options to API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'Response'
              }]
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await provider.complete('Test prompt', 'gemini-2.0-flash', {
        max_tokens: 2048,
        temperature: 0.3,
        generationConfig: {
          topP: 0.9
        }
      })

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(callBody.generationConfig.maxOutputTokens).toBe(2048)
      expect(callBody.generationConfig.temperature).toBe(0.3)
      expect(callBody.generationConfig.topP).toBe(0.9)
    })

    it('should throw error if API key is missing', async () => {
      const noKeyProvider = new GoogleAIProvider({})

      await expect(
        noKeyProvider.complete('Test prompt')
      ).rejects.toThrow('GoogleAIProvider API key is not configured')
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ error: { message: 'Invalid request' } })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await expect(
        provider.complete('Test prompt')
      ).rejects.toThrow('Google AI API error: Invalid request')
    })

    it('should return empty string if no content in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: []
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await provider.complete('Test prompt')
      expect(result).toBe('')
    })

    it('should handle timeout', async () => {
      vi.useFakeTimers()
      const timeoutProvider = new GoogleAIProvider({
        apiKey: 'test-key',
        timeout: 100 // Very short timeout
      })
      
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ candidates: [] })
        }), 200)
      })

      global.fetch.mockReturnValue(slowPromise)

      const completePromise = timeoutProvider.complete('Test prompt', 'gemini-2.0-flash')
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(150)
      
      await expect(completePromise).rejects.toThrow('Request timed out')
      
      vi.useRealTimers()
    })
  })
})
