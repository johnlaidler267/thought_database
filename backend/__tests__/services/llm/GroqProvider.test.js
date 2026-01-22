import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GroqProvider } from '../../../services/llm/providers/GroqProvider.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('GroqProvider', () => {
  let provider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new GroqProvider({
      apiKey: 'test-groq-key',
      timeout: 10000
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('transcribe', () => {
    it('should transcribe audio successfully', async () => {
      const mockAudioBuffer = Buffer.from('fake audio data')
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'Transcribed text' })
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await provider.transcribe(mockAudioBuffer, 'audio/webm')

      expect(result).toBe('Transcribed text')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audio/transcriptions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-groq-key'
          })
        })
      )
    })

    it('should throw error if API key is missing', async () => {
      const noKeyProvider = new GroqProvider({})
      const mockAudioBuffer = Buffer.from('fake audio data')

      await expect(
        noKeyProvider.transcribe(mockAudioBuffer)
      ).rejects.toThrow('GroqProvider API key is not configured')
    })

    it('should handle API errors', async () => {
      const mockAudioBuffer = Buffer.from('fake audio data')
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ error: { message: 'Invalid audio format' } })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await expect(
        provider.transcribe(mockAudioBuffer)
      ).rejects.toThrow('Groq API error: Invalid audio format')
    })

    it('should handle timeout', async () => {
      vi.useFakeTimers()
      const timeoutProvider = new GroqProvider({
        apiKey: 'test-key',
        timeout: 100 // Very short timeout
      })
      
      const mockAudioBuffer = Buffer.from('fake audio data')
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'result' })
        }), 200)
      })

      global.fetch.mockReturnValue(slowPromise)

      const transcribePromise = timeoutProvider.transcribe(mockAudioBuffer, 'audio/webm')
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(150)
      
      await expect(transcribePromise).rejects.toThrow('Request timed out')
      
      vi.useRealTimers()
    })
  })

  describe('complete', () => {
    it('should complete prompt successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Generated response'
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await provider.complete('Test prompt', 'llama-3.3-70b-versatile')

      expect(result).toBe('Generated response')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-groq-key',
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
          choices: [{
            message: {
              content: 'Response'
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await provider.complete('Test prompt')

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('llama-3.3-70b-versatile')
    })

    it('should pass options to API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Response'
            }
          }]
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await provider.complete('Test prompt', 'llama-3.3-70b-versatile', {
        max_tokens: 512,
        temperature: 0.5
      })

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(callBody.max_tokens).toBe(512)
      expect(callBody.temperature).toBe(0.5)
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ error: { message: 'Invalid API key' } })
      }

      global.fetch.mockResolvedValue(mockResponse)

      await expect(
        provider.complete('Test prompt')
      ).rejects.toThrow('Groq API error: Invalid API key')
    })

    it('should return empty string if no content in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: []
        })
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await provider.complete('Test prompt')
      expect(result).toBe('')
    })
  })
})
