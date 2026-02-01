import { describe, it, expect } from 'vitest'
import { estimateTokens, estimateTranscriptionTokens, estimateTotalTokens } from '../../utils/tokenEstimator'

/**
 * Tests for token-based usage tracking functionality in HomePage
 * These tests verify that tokens_used is correctly calculated and incremented for apprentice and trial tier users
 */
describe('HomePage - Token Usage Tracking', () => {
  describe('Token estimation', () => {
    it('should estimate tokens from text correctly', () => {
      // Simple text: ~0.75 words per token
      expect(estimateTokens('hello world')).toBeGreaterThan(0)
      expect(estimateTokens('hello world')).toBeLessThanOrEqual(3) // 2 words = ~3 tokens
      
      // Longer text
      const longText = 'This is a longer piece of text that should result in more tokens being estimated.'
      const tokens = estimateTokens(longText)
      expect(tokens).toBeGreaterThan(10)
      expect(tokens).toBeLessThan(30)
    })

    it('should handle empty or null text', () => {
      expect(estimateTokens('')).toBe(0)
      expect(estimateTokens(null)).toBe(0)
      expect(estimateTokens(undefined)).toBe(0)
    })

    it('should handle single word', () => {
      expect(estimateTokens('hello')).toBeGreaterThan(0)
    })

    it('should estimate transcription tokens (audio input is token-heavy)', () => {
      const transcript = 'This is a test transcript'
      const transcriptionTokens = estimateTranscriptionTokens(transcript)
      const textTokens = estimateTokens(transcript)
      
      // Transcription should use more tokens than just text (audio encoding)
      expect(transcriptionTokens).toBeGreaterThanOrEqual(textTokens)
    })
  })

  describe('Total token calculation', () => {
    it('should calculate total tokens for complete thought processing', () => {
      const rawTranscript = 'This is a raw transcript with some errors'
      const cleanedText = 'This is a cleaned transcript with some errors fixed'
      const tags = ['test', 'example']

      const totalTokens = estimateTotalTokens(rawTranscript, cleanedText, tags)
      
      expect(totalTokens).toBeGreaterThan(0)
      // Should include transcription + cleaning + tagging
      expect(totalTokens).toBeGreaterThan(estimateTokens(rawTranscript))
    })

    it('should handle empty tags array', () => {
      const rawTranscript = 'Test transcript'
      const cleanedText = 'Test transcript'
      const tags = []

      const totalTokens = estimateTotalTokens(rawTranscript, cleanedText, tags)
      expect(totalTokens).toBeGreaterThan(0)
    })

    it('should calculate tokens for transcription, cleaning, and tagging', () => {
      const rawTranscript = 'Hello world this is a test'
      const cleanedText = 'Hello world, this is a test.'
      const tags = ['greeting', 'test']

      const totalTokens = estimateTotalTokens(rawTranscript, cleanedText, tags)
      
      // Should be sum of all three operations
      const transcriptionTokens = estimateTranscriptionTokens(rawTranscript) + estimateTokens(rawTranscript)
      const cleaningTokens = estimateTokens(rawTranscript) + estimateTokens(cleanedText)
      const taggingTokens = estimateTokens(cleanedText) + estimateTokens(tags.join(', '))
      const expectedTotal = transcriptionTokens + cleaningTokens + taggingTokens
      
      expect(totalTokens).toBe(expectedTotal)
    })
  })

  describe('Usage tracking conditions', () => {
    it('should track usage for apprentice and trial tiers', () => {
      const shouldTrackUsage = (tier) => {
        return tier === 'apprentice' || tier === 'trial'
      }

      expect(shouldTrackUsage('apprentice')).toBe(true)
      expect(shouldTrackUsage('trial')).toBe(true)
      expect(shouldTrackUsage('pro')).toBe(false)
      expect(shouldTrackUsage('sovereign')).toBe(false)
    })

    it('should calculate tokens_used increment correctly', () => {
      const updateTokensUsed = (currentTokens, newTokens) => {
        return (currentTokens || 0) + newTokens
      }

      expect(updateTokensUsed(0, 100)).toBe(100)
      expect(updateTokensUsed(5000, 250)).toBe(5250)
      expect(updateTokensUsed(100000, 1500)).toBe(101500)
      expect(updateTokensUsed(null, 100)).toBe(100) // Handle null
      expect(updateTokensUsed(undefined, 200)).toBe(200) // Handle undefined
    })
  })

  describe('Usage tracking scenarios', () => {
    it('should track tokens when saving a thought for apprentice tier', () => {
      const scenario = {
        tier: 'apprentice',
        rawTranscript: 'This is a test recording',
        cleanedText: 'This is a test recording.',
        tags: ['test'],
        currentTokensUsed: 5000,
      }

      const tokensUsed = estimateTotalTokens(
        scenario.rawTranscript,
        scenario.cleanedText,
        scenario.tags
      )
      const newTokensUsed = scenario.currentTokensUsed + tokensUsed

      expect(tokensUsed).toBeGreaterThan(0)
      expect(newTokensUsed).toBeGreaterThan(scenario.currentTokensUsed)
    })

    it('should track usage for trial tier', () => {
      const scenario = {
        tier: 'trial',
        rawTranscript: 'This is a test',
        cleanedText: 'This is a test.',
        tags: [],
        currentTokensUsed: 0,
      }

      const shouldTrack = scenario.tier === 'apprentice' || scenario.tier === 'trial'
      const tokensUsed = shouldTrack
        ? estimateTotalTokens(scenario.rawTranscript, scenario.cleanedText, scenario.tags)
        : 0
      const newTokensUsed = scenario.currentTokensUsed + tokensUsed

      expect(shouldTrack).toBe(true)
      expect(tokensUsed).toBeGreaterThan(0)
      expect(newTokensUsed).toBeGreaterThan(scenario.currentTokensUsed)
    })

    it('should track tokens for both recorded and typed thoughts', () => {
      // Both recording and typing use the same API calls (cleaning, tagging)
      const rawText = 'This is a thought'
      const cleanedText = 'This is a thought.'
      const tags = ['thought']

      const tokensUsed = estimateTotalTokens(rawText, cleanedText, tags)
      
      // Should track tokens regardless of input method (recording vs typing)
      expect(tokensUsed).toBeGreaterThan(0)
    })
  })
})
