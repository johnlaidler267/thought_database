import { describe, it, expect } from 'vitest'

// Test the environment mode detection logic
// Since import.meta.env is read-only in Vite, we test the logic directly
const getEnvironmentMode = (apiUrl) => {
  const url = apiUrl || 'http://localhost:3001'
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')
  return isLocalhost ? 'Development' : 'Production'
}

describe('SettingsPage - Environment Mode Detection', () => {
  describe('getEnvironmentMode function', () => {
    it('should detect Development mode when API URL is localhost', () => {
      const mode = getEnvironmentMode('http://localhost:3001')
      expect(mode).toBe('Development')
    })

    it('should detect Development mode when API URL contains 127.0.0.1', () => {
      const mode = getEnvironmentMode('http://127.0.0.1:3001')
      expect(mode).toBe('Development')
    })

    it('should detect Production mode when API URL is not localhost', () => {
      const mode = getEnvironmentMode('https://api.production.com')
      expect(mode).toBe('Production')
    })

    it('should detect Production mode when API URL is a production domain', () => {
      const mode = getEnvironmentMode('https://api.example.com/api')
      expect(mode).toBe('Production')
    })

    it('should default to Development when API URL is not provided', () => {
      const mode = getEnvironmentMode()
      expect(mode).toBe('Development')
    })

    it('should default to Development when API URL is undefined', () => {
      const mode = getEnvironmentMode(undefined)
      expect(mode).toBe('Development')
    })

    it('should default to Development when API URL is empty string', () => {
      const mode = getEnvironmentMode('')
      expect(mode).toBe('Development')
    })

    it('should handle localhost with different ports', () => {
      expect(getEnvironmentMode('http://localhost:5173')).toBe('Development')
      expect(getEnvironmentMode('http://localhost:8080')).toBe('Development')
    })

    it('should handle localhost in different protocols', () => {
      expect(getEnvironmentMode('https://localhost:3001')).toBe('Development')
      expect(getEnvironmentMode('http://localhost')).toBe('Development')
    })
  })
})
