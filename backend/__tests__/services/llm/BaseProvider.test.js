import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseProvider } from '../../../services/llm/base/BaseProvider.js'

// Create a test provider class
class TestProvider extends BaseProvider {
  async testMethod() {
    return 'success'
  }
}

describe('BaseProvider', () => {
  let provider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new TestProvider({
      apiKey: 'test-key',
      timeout: 5000
    })
  })

  describe('constructor', () => {
    it('should set config and apiKey', () => {
      expect(provider.config).toBeDefined()
      expect(provider.apiKey).toBe('test-key')
      expect(provider.timeout).toBe(5000)
    })

    it('should use default timeout if not provided', () => {
      const defaultProvider = new TestProvider({ apiKey: 'test' })
      expect(defaultProvider.timeout).toBe(30000)
    })
  })

  describe('withTimeout', () => {
    it('should return result if promise resolves before timeout', async () => {
      const promise = Promise.resolve('success')
      const result = await provider.withTimeout(promise, 1000)
      expect(result).toBe('success')
    })

    it('should throw timeout error if promise takes too long', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 2000)
      })

      await expect(
        provider.withTimeout(promise, 100)
      ).rejects.toThrow('Request timed out after 100ms')
    })

    it('should use default timeout if not specified', async () => {
      vi.useFakeTimers()
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 6000)
      })

      const timeoutPromise = provider.withTimeout(promise)
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(5000)
      
      await expect(timeoutPromise).rejects.toThrow('Request timed out after 5000ms')
      
      vi.useRealTimers()
    })
  })

  describe('validateApiKey', () => {
    it('should throw error if apiKey is missing', () => {
      const noKeyProvider = new TestProvider({})
      expect(() => noKeyProvider.validateApiKey()).toThrow('TestProvider API key is not configured')
    })

    it('should not throw if apiKey is present', () => {
      expect(() => provider.validateApiKey()).not.toThrow()
    })
  })
})
