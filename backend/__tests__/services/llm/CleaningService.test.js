import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CleaningService } from '../../../services/llm/services/CleaningService.js'

// Mock GoogleAIProvider
vi.mock('../../../services/llm/providers/GoogleAIProvider.js', () => {
  class MockGoogleAIProvider {
    constructor(config) {
      this.apiKey = config.apiKey
      this.complete = vi.fn()
      this.validateApiKey = vi.fn()
    }
  }
  return {
    GoogleAIProvider: MockGoogleAIProvider
  }
})

describe('CleaningService', () => {
  let service
  let mockProvider

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CleaningService({
      googleApiKey: 'test-key',
      timeout: 30000
    })
    mockProvider = service.provider
  })

  describe('constructor', () => {
    it('should initialize with Google AI provider', () => {
      expect(service.provider).toBeDefined()
      expect(service.provider.apiKey).toBe('test-key')
    })

    it('should use environment variable if key not provided', () => {
      process.env.GOOGLE_AI_API_KEY = 'env-key'
      const envService = new CleaningService()
      expect(envService.provider.apiKey).toBe('env-key')
      delete process.env.GOOGLE_AI_API_KEY
    })

    it('should have cleaning prompt', () => {
      expect(service.prompt).toContain('text cleaning assistant')
      expect(service.prompt).toContain('filler words')
    })
  })

  describe('clean', () => {
    it('should clean transcript successfully', async () => {
      const transcript = 'um, so I was thinking, like, you know, maybe we should do this'
      mockProvider.complete.mockResolvedValue('I was thinking maybe we should do this')

      const result = await service.clean(transcript)

      expect(result).toBe('I was thinking maybe we should do this')
      expect(mockProvider.complete).toHaveBeenCalledWith(
        expect.stringContaining(transcript),
        'gemini-2.0-flash-exp',
        expect.objectContaining({
          max_tokens: expect.any(Number),
          temperature: 0.3
        })
      )
    })

    it('should return original transcript if input is empty', async () => {
      const result = await service.clean('')
      expect(result).toBe('')
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should return original transcript if input is whitespace only', async () => {
      const result = await service.clean('   ')
      expect(result).toBe('   ')
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should handle timeout gracefully', async () => {
      const transcript = 'Test transcript'
      mockProvider.complete.mockRejectedValue(new Error('Request timed out after 30000ms'))

      const result = await service.clean(transcript)

      expect(result).toBe(transcript) // Returns original on timeout
    })

    it('should handle API errors gracefully', async () => {
      const transcript = 'Test transcript'
      mockProvider.complete.mockRejectedValue(new Error('API error'))

      const result = await service.clean(transcript)

      expect(result).toBe(transcript) // Returns original on error
    })

    it('should handle empty response from API', async () => {
      const transcript = 'Test transcript'
      mockProvider.complete.mockResolvedValue('')

      const result = await service.clean(transcript)

      expect(result).toBe(transcript) // Returns original if API returns empty
    })

    it('should calculate max_tokens based on transcript length', async () => {
      const transcript = 'a'.repeat(1000) // Long transcript
      mockProvider.complete.mockResolvedValue('Cleaned')

      await service.clean(transcript)

      const callArgs = mockProvider.complete.mock.calls[0]
      expect(callArgs[2].max_tokens).toBeGreaterThanOrEqual(2000) // At least 2x transcript length
    })
  })

  describe('isConfigured', () => {
    it('should return true if API key is present', () => {
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false if API key is missing', () => {
      const noKeyService = new CleaningService({})
      expect(noKeyService.isConfigured()).toBe(false)
    })
  })
})
