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
      expect(service.prompt).toContain('NAMES:')
    })
  })

  describe('extractTags', () => {
    it('should extract tags, mentions, and thought_type from response', async () => {
      const text = 'I need to call Sarah tomorrow about the meeting'
      mockProvider.complete.mockResolvedValue('TAGS: #task #planning #reminder\nNAMES: Sarah\nTYPE: TASK')

      const result = await service.extractTags(text)

      expect(result).toEqual({ tags: ['task', 'planning', 'reminder'], mentions: ['Sarah'], thought_type: 'TASK' })
      expect(mockProvider.complete).toHaveBeenCalledWith(
        expect.stringContaining(text),
        'llama-3.3-70b-versatile',
        expect.objectContaining({
          max_tokens: 256,
          temperature: 0.3
        })
      )
    })

    it('should return empty tags, mentions, and null thought_type if input is empty', async () => {
      const result = await service.extractTags('')
      expect(result).toEqual({ tags: [], mentions: [], thought_type: null })
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should return empty tags, mentions, and null thought_type if input is whitespace only', async () => {
      const result = await service.extractTags('   ')
      expect(result).toEqual({ tags: [], mentions: [], thought_type: null })
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should parse TAGS line with #tag format', async () => {
      mockProvider.complete.mockResolvedValue('Here are the tags:\nTAGS: #perception #mindfulness #frameworks\nNAMES:\nTYPE: REFLECTION')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['perception', 'mindfulness', 'frameworks'])
      expect(result.mentions).toEqual([])
      expect(result.thought_type).toBe('REFLECTION')
    })

    it('should parse multi-word tags', async () => {
      mockProvider.complete.mockResolvedValue('TAGS: #self image #identity #confidence\nNAMES:\nTYPE: REFLECTION')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['self image', 'identity', 'confidence'])
    })

    it('should normalize tags to lowercase and dedupe', async () => {
      mockProvider.complete.mockResolvedValue('TAGS: #Creativity #creativity #CREATIVITY #psychology\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['creativity', 'psychology'])
    })

    it('should cap at 5 tags', async () => {
      mockProvider.complete.mockResolvedValue('TAGS: #a #b #c #d #e #f #g\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('should return empty tags when response has no #tags', async () => {
      mockProvider.complete.mockResolvedValue('No tags found for this text.')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual([])
      expect(result.mentions).toEqual([])
      expect(result.thought_type).toBeNull()
    })

    it('should parse NAMES line', async () => {
      mockProvider.complete.mockResolvedValue('TAGS: #meeting\nNAMES: Alice Smith, Bob Jones\nTYPE: TASK')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['meeting'])
      expect(result.mentions).toEqual(['Alice Smith', 'Bob Jones'])
      expect(result.thought_type).toBe('TASK')
    })

    it('should parse TYPE line and accept only valid values', async () => {
      mockProvider.complete.mockResolvedValue('TAGS: #idea\nNAMES:\nTYPE: IDEA')

      const result = await service.extractTags('Some text')

      expect(result.thought_type).toBe('IDEA')
    })

    it('should handle response with no # prefix gracefully', async () => {
      mockProvider.complete.mockResolvedValue('perception mindfulness frameworks\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('API error'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual({ tags: [], mentions: [], thought_type: null })
    })

    it('should handle timeout gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('Request timed out'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual({ tags: [], mentions: [], thought_type: null })
    })

    it('should handle empty or whitespace-only tag response', async () => {
      mockProvider.complete.mockResolvedValue('')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual([])
      expect(result.mentions).toEqual([])
      expect(result.thought_type).toBeNull()
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
