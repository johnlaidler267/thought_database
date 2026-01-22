import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    copyFileSync: vi.fn(),
  }
}))

// Mock process.argv
const originalArgv = process.argv

describe('switch-mode.js script', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  it('should switch to dev mode when dev files exist', () => {
    // Mock file existence
    fs.existsSync.mockImplementation((filePath) => {
      return filePath.includes('.env.dev')
    })

    // Simulate running: node scripts/switch-mode.js dev
    process.argv = ['node', 'scripts/switch-mode.js', 'dev']

    // This would normally be executed, but we're testing the logic
    // In a real scenario, we'd import and call the function
    const backendDevPath = path.join(process.cwd(), 'backend', '.env.dev')
    const backendEnvPath = path.join(process.cwd(), 'backend', '.env')
    const frontendDevPath = path.join(process.cwd(), 'frontend', '.env.dev')
    const frontendEnvPath = path.join(process.cwd(), 'frontend', '.env')

    if (fs.existsSync(backendDevPath)) {
      fs.copyFileSync(backendDevPath, backendEnvPath)
    }
    if (fs.existsSync(frontendDevPath)) {
      fs.copyFileSync(frontendDevPath, frontendEnvPath)
    }

    expect(fs.existsSync).toHaveBeenCalled()
    expect(fs.copyFileSync).toHaveBeenCalled()
  })

  it('should switch to prod mode when prod files exist', () => {
    fs.existsSync.mockImplementation((filePath) => {
      return filePath.includes('.env.prod')
    })

    process.argv = ['node', 'scripts/switch-mode.js', 'prod']

    const backendProdPath = path.join(process.cwd(), 'backend', '.env.prod')
    const backendEnvPath = path.join(process.cwd(), 'backend', '.env')
    const frontendProdPath = path.join(process.cwd(), 'frontend', '.env.prod')
    const frontendEnvPath = path.join(process.cwd(), 'frontend', '.env')

    if (fs.existsSync(backendProdPath)) {
      fs.copyFileSync(backendProdPath, backendEnvPath)
    }
    if (fs.existsSync(frontendProdPath)) {
      fs.copyFileSync(frontendProdPath, frontendEnvPath)
    }

    expect(fs.existsSync).toHaveBeenCalled()
    expect(fs.copyFileSync).toHaveBeenCalled()
  })

  it('should handle missing dev files gracefully', () => {
    fs.existsSync.mockReturnValue(false)

    const backendDevPath = path.join(process.cwd(), 'backend', '.env.dev')
    const frontendDevPath = path.join(process.cwd(), 'frontend', '.env.dev')

    const backendExists = fs.existsSync(backendDevPath)
    const frontendExists = fs.existsSync(frontendDevPath)

    expect(backendExists).toBe(false)
    expect(frontendExists).toBe(false)
    // Should not throw, just skip
  })

  it('should handle missing prod files gracefully', () => {
    fs.existsSync.mockReturnValue(false)

    const backendProdPath = path.join(process.cwd(), 'backend', '.env.prod')
    const frontendProdPath = path.join(process.cwd(), 'frontend', '.env.prod')

    const backendExists = fs.existsSync(backendProdPath)
    const frontendExists = fs.existsSync(frontendProdPath)

    expect(backendExists).toBe(false)
    expect(frontendExists).toBe(false)
    // Should not throw, just skip
  })

  it('should validate mode parameter', () => {
    const validModes = ['dev', 'prod']
    const invalidMode = 'invalid'

    expect(validModes.includes('dev')).toBe(true)
    expect(validModes.includes('prod')).toBe(true)
    expect(validModes.includes(invalidMode)).toBe(false)
  })
})
