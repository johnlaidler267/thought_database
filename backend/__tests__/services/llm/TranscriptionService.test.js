import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TranscriptionService } from '../../../services/llm/services/TranscriptionService.js'

// Mock GroqProvider
vi.mock('../../../services/llm/providers/GroqProvider.js', () => {
  class MockGroqProvider {
    constructor(config) {
      this.apiKey = config.apiKey
      this.timeout = config.timeout
      this.transcribe = vi.fn()
      this.validateApiKey = vi.fn()
    }
  }
  return {
    GroqProvider: MockGroqProvider
  }
})

describe('TranscriptionService', () => {
  let service
  let mockProvider

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TranscriptionService({
      groqApiKey: 'test-key',
      timeout: 300000
    })
    mockProvider = service.provider
  })

  describe('constructor', () => {
    it('should initialize with Groq provider', () => {
      expect(service.provider).toBeDefined()
      expect(service.provider.apiKey).toBe('test-key')
    })

    it('should use environment variable if key not provided', () => {
      process.env.GROQ_API_KEY = 'env-key'
      const envService = new TranscriptionService()
      expect(envService.provider.apiKey).toBe('env-key')
      delete process.env.GROQ_API_KEY
    })

    it('should set default timeout', () => {
      expect(service.provider.timeout).toBe(300000)
    })
  })

  describe('transcribe', () => {
    it('should transcribe audio successfully', async () => {
      const mockAudioBuffer = Buffer.from('fake audio')
      mockProvider.transcribe.mockResolvedValue('Transcribed text')

      const result = await service.transcribe(mockAudioBuffer, 'audio/webm')

      expect(result).toBe('Transcribed text')
      expect(mockProvider.transcribe).toHaveBeenCalledWith(mockAudioBuffer, 'audio/webm')
    })

    it('should handle transcription errors', async () => {
      const mockAudioBuffer = Buffer.from('fake audio')
      mockProvider.transcribe.mockRejectedValue(new Error('API error'))

      await expect(
        service.transcribe(mockAudioBuffer)
      ).rejects.toThrow('Transcription failed: API error')
    })

    it('should use default mimeType if not provided', async () => {
      const mockAudioBuffer = Buffer.from('fake audio')
      mockProvider.transcribe.mockResolvedValue('Text')

      await service.transcribe(mockAudioBuffer)

      expect(mockProvider.transcribe).toHaveBeenCalledWith(mockAudioBuffer, 'audio/webm')
    })
  })

  describe('isConfigured', () => {
    it('should return true if API key is present', () => {
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false if API key is missing', () => {
      const noKeyService = new TranscriptionService({})
      expect(noKeyService.isConfigured()).toBe(false)
    })
  })
})
