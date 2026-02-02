import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaggingService } from '../../../services/llm/services/TaggingService.js'

// Mock GroqProvider
vi.mock('../../../services/llm/providers/GroqProvider.js', () => {
  class MockGroqProvider {
    constructor(config) {
      this.apiKey = config.apiKey
      this.complete = vi.fn()
      this.validateApiKey = vi.fn()
    }
  }
  return {
    GroqProvider: MockGroqProvider
  }
})

describe('TaggingService', () => {
  let service
  let mockProvider

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TaggingService({
      groqApiKey: 'test-key',
      timeout: 10000
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
      const envService = new TaggingService()
      expect(envService.provider.apiKey).toBe('env-key')
      delete process.env.GROQ_API_KEY
    })

    it('should have semantic tagging prompt', () => {
      expect(service.prompt).toContain('semantic tagging engine')
      expect(service.prompt).toContain('{{TEXT}}')
      expect(service.prompt).toContain('Output 3–5 tags')
    })
  })

  describe('extractTags', () => {
    it('should extract tags successfully from #tag format', async () => {
      const text = 'I need to call Sarah tomorrow about the meeting'
      mockProvider.complete.mockResolvedValue('#task #planning #reminder')

      const result = await service.extractTags(text)

      expect(result).toEqual(['task', 'planning', 'reminder'])
      expect(mockProvider.complete).toHaveBeenCalledWith(
        expect.stringContaining(text),
        'llama-3.3-70b-versatile',
        expect.objectContaining({
          max_tokens: 128,
          temperature: 0.3
        })
      )
    })

    it('should return empty array if input is empty', async () => {
      const result = await service.extractTags('')
      expect(result).toEqual([])
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should return empty array if input is whitespace only', async () => {
      const result = await service.extractTags('   ')
      expect(result).toEqual([])
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should parse #tag format with extra text', async () => {
      mockProvider.complete.mockResolvedValue('Here are the tags:\n#perception #mindfulness #frameworks')

      const result = await service.extractTags('Some text')

      expect(result).toEqual(['perception', 'mindfulness', 'frameworks'])
    })

    it('should normalize tags to lowercase and dedupe', async () => {
      mockProvider.complete.mockResolvedValue('#Creativity #creativity #CREATIVITY #psychology')

      const result = await service.extractTags('Some text')

      expect(result).toEqual(['creativity', 'psychology'])
    })

    it('should cap at 5 tags', async () => {
      mockProvider.complete.mockResolvedValue('#a #b #c #d #e #f #g')

      const result = await service.extractTags('Some text')

      expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('should return empty array when response has no #tags', async () => {
      mockProvider.complete.mockResolvedValue('No tags found for this text.')

      const result = await service.extractTags('Some text')

      expect(result).toEqual([])
    })

    it('should handle response with no # prefix gracefully', async () => {
      mockProvider.complete.mockResolvedValue('perception mindfulness frameworks')

      const result = await service.extractTags('Some text')

      expect(result).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('API error'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual([]) // Returns empty array on error
    })

    it('should handle timeout gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('Request timed out'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual([]) // Returns empty array on timeout
    })

    it('should handle empty or whitespace-only tag response', async () => {
      mockProvider.complete.mockResolvedValue('')

      const result = await service.extractTags('Some text')

      expect(result).toEqual([])
    })
  })

  describe('isConfigured', () => {
    it('should return true if API key is present', () => {
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false if API key is missing', () => {
      const noKeyService = new TaggingService({})
      expect(noKeyService.isConfigured()).toBe(false)
    })
  })
})
