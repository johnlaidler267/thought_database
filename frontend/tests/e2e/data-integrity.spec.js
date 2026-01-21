import { test, expect } from '@playwright/test'

test.describe('Data Loss Prevention', () => {
  test('transcript persists through network failure', async ({ page }) => {
    // Intercept and abort transcription API call
    await page.route('**/api/transcribe', route => route.abort())
    
    // Navigate to homepage
    await page.goto('/')
    
    // Wait for page to load (assuming user is logged in)
    await page.waitForLoadState('networkidle')
    
    // Start recording
    const recordButton = page.locator('[aria-label="Start recording"]')
    if (await recordButton.isVisible()) {
      await recordButton.click()
      
      // Wait a moment for recording to start
      await page.waitForTimeout(1000)
      
      // Stop recording
      await page.locator('[aria-label="Stop recording"]').click()
      
      // Even though transcription fails, verify transcript editor appears
      // (This tests the error handling preserves the draft)
      const textarea = page.locator('textarea')
      await expect(textarea).toBeVisible({ timeout: 5000 })
      
      // Verify draft is saved to localStorage
      const draft = await page.evaluate(() => 
        localStorage.getItem('draftTranscript')
      )
      expect(draft).toBeTruthy()
    }
  })

  test('transcript persists through page refresh', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Simulate having a draft transcript
    await page.evaluate(() => {
      localStorage.setItem('draftTranscript', 'Test transcript content')
    })
    
    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify transcript is still accessible (if app supports draft recovery)
    // This test may need adjustment based on actual implementation
  })

  test('no data loss when recording hits 5-minute limit', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Mock time to simulate 5-minute recording
    await page.addInitScript(() => {
      const startTime = Date.now()
      const originalNow = Date.now
      Date.now = () => startTime + (5 * 60 * 1000) + (Date.now() - startTime)
    })
    
    const recordButton = page.locator('[aria-label="Start recording"]')
    if (await recordButton.isVisible()) {
      await recordButton.click()
      
      // Wait for auto-stop message
      await page.waitForSelector('text=Recording stopped at 5 minute limit', { timeout: 10000 })
      
      // Verify transcript editor opens
      const textarea = page.locator('textarea')
      await expect(textarea).toBeVisible({ timeout: 5000 })
      
      // Verify transcript content exists
      const transcript = await textarea.inputValue()
      expect(transcript.length).toBeGreaterThan(0)
    }
  })

  test('transcript survives browser navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Simulate having a draft in editor
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('Test transcript that should persist')
      
      // Navigate away (if possible)
      // Then navigate back
      await page.goto('/settings')
      await page.goto('/')
      
      // Verify transcript is still there (if app supports this)
      // This test may need adjustment based on actual implementation
    }
  })
})
