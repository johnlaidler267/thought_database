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

    it('should have semantic tagging prompt with vocabulary block and text placeholder', () => {
      expect(service.basePrompt).toContain('semantic tagging engine')
      expect(service.basePrompt).toContain('{{TEXT}}')
      expect(service.basePrompt).toContain('{{EXISTING_TAGS_BLOCK}}')
      expect(service.basePrompt).toContain('Assign 2–4 tags')
      expect(service.basePrompt).toContain('NAMES:')
    })
  })

  describe('buildExistingTagsBlock', () => {
    it('should return instruction for empty vocabulary', () => {
      const block = service.buildExistingTagsBlock([])
      expect(block).toContain('(none yet)')
      expect(block).toContain('Suggest 2–4 new broad')
    })

    it('should include provided tags in vocabulary', () => {
      const block = service.buildExistingTagsBlock(['work', 'relationships'])
      expect(block).toContain('work')
      expect(block).toContain('relationships')
    })
  })

  describe('extractTags', () => {
    it('should extract tags, mentions, and thought_type from JSON + NAMES + TYPE response', async () => {
      const text = 'I need to call Sarah tomorrow about the meeting'
      mockProvider.complete.mockResolvedValue('["task", "planning", "reminder"]\nNAMES: Sarah\nTYPE: TASK')

      const result = await service.extractTags(text)

      expect(result).toEqual({ tags: ['task', 'planning', 'reminder'], mentions: ['Sarah'], key_points: {}, thought_type: 'TASK' })
      expect(mockProvider.complete).toHaveBeenCalledWith(
        expect.stringContaining(text),
        'llama-3.3-70b-versatile',
        expect.objectContaining({
          max_tokens: 256,
          temperature: 0.3
        })
      )
    })

    it('should inject existing tag vocabulary into prompt when provided', async () => {
      mockProvider.complete.mockResolvedValue('["work", "basketball"]\nNAMES:\nTYPE: IDEA')
      await service.extractTags('Some text', ['work', 'relationships', 'basketball'])

      const callArg = mockProvider.complete.mock.calls[0][0]
      expect(callArg).toContain('work')
      expect(callArg).toContain('relationships')
      expect(callArg).toContain('basketball')
      expect(callArg).toContain('Existing tag vocabulary')
    })

    it('should return empty tags, mentions, and null thought_type if input is empty', async () => {
      const result = await service.extractTags('')
      expect(result).toEqual({ tags: [], mentions: [], key_points: {}, thought_type: null })
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should return empty tags, mentions, and null thought_type if input is whitespace only', async () => {
      const result = await service.extractTags('   ')
      expect(result).toEqual({ tags: [], mentions: [], key_points: {}, thought_type: null })
      expect(mockProvider.complete).not.toHaveBeenCalled()
    })

    it('should parse JSON array on first line', async () => {
      mockProvider.complete.mockResolvedValue('["perception", "mindfulness", "frameworks"]\nNAMES:\nTYPE: REFLECTION')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['perception', 'mindfulness', 'frameworks'])
      expect(result.mentions).toEqual([])
      expect(result.thought_type).toBe('REFLECTION')
    })

    it('should parse multi-word tags from JSON', async () => {
      mockProvider.complete.mockResolvedValue('["self image", "identity", "confidence"]\nNAMES:\nTYPE: REFLECTION')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['self image', 'identity', 'confidence'])
    })

    it('should normalize tags to lowercase and dedupe', async () => {
      mockProvider.complete.mockResolvedValue('["Creativity", "creativity", "CREATIVITY", "psychology"]\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['creativity', 'psychology'])
    })

    it('should cap at 5 tags', async () => {
      mockProvider.complete.mockResolvedValue('["a", "b", "c", "d", "e", "f", "g"]\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('should return empty tags when first line has no JSON array', async () => {
      mockProvider.complete.mockResolvedValue('No tags found for this text.')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual([])
      expect(result.mentions).toEqual([])
      expect(result.thought_type).toBeNull()
    })

    it('should parse NAMES line', async () => {
      mockProvider.complete.mockResolvedValue('["meeting"]\nNAMES: Alice Smith, Bob Jones\nTYPE: TASK')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual(['meeting'])
      expect(result.mentions).toEqual(['Alice Smith', 'Bob Jones'])
      expect(result.thought_type).toBe('TASK')
    })

    it('should parse TYPE line and accept only valid values', async () => {
      mockProvider.complete.mockResolvedValue('["idea"]\nNAMES:\nTYPE: IDEA')

      const result = await service.extractTags('Some text')

      expect(result.thought_type).toBe('IDEA')
    })

    it('should handle response with no JSON array on first line', async () => {
      mockProvider.complete.mockResolvedValue('perception mindfulness frameworks\nNAMES:')

      const result = await service.extractTags('Some text')

      expect(result.tags).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('API error'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual({ tags: [], mentions: [], key_points: {}, thought_type: null })
    })

    it('should handle timeout gracefully', async () => {
      mockProvider.complete.mockRejectedValue(new Error('Request timed out'))

      const result = await service.extractTags('Some text')

      expect(result).toEqual({ tags: [], mentions: [], key_points: {}, thought_type: null })
    })

    it('should parse KEYPOINTS line', async () => {
      mockProvider.complete.mockResolvedValue('["meeting"]\nNAMES: Sarah, Bob\nKEYPOINTS: Sarah: colleague from marketing | Bob: null\nTYPE: TASK')

      const result = await service.extractTags('Some text')

      expect(result.mentions).toEqual(['Sarah', 'Bob'])
      expect(result.key_points).toEqual({ Sarah: ['colleague from marketing'], Bob: null })
    })

    it('should parse KEYPOINTS with multiple points per person', async () => {
      mockProvider.complete.mockResolvedValue('["work"]\nNAMES: Sarah\nKEYPOINTS: Sarah: colleague from marketing; mentioned the Friday meeting\nTYPE: TASK')

      const result = await service.extractTags('Some text')

      expect(result.mentions).toEqual(['Sarah'])
      expect(result.key_points).toEqual({ Sarah: ['colleague from marketing', 'mentioned the Friday meeting'] })
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
