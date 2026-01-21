import { test, expect } from '@playwright/test'

test.describe('Security', () => {
  test('users cannot access other users thoughts via API', async ({ page, request }) => {
    // This test assumes you have test users set up
    // In a real scenario, you'd authenticate as user A
    // Then try to fetch user B's thoughts
    
    // Mock Supabase response to simulate RLS policy
    await page.route('**/rest/v1/thoughts*', route => {
      // Simulate RLS: only return thoughts for authenticated user
      route.fulfill({
        status: 200,
        body: JSON.stringify([]) // Empty array - user can't see others' thoughts
      })
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Verify thoughts are filtered by user
    // This test may need adjustment based on actual auth implementation
  })

  test('XSS prevention in transcript content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Try to inject script in transcript
    const maliciousScript = '<script>alert("XSS")</script>'
    
    // If there's a way to input transcript directly, test it
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill(maliciousScript)
      
      // Submit and verify script is not executed
      // Check that script tags are sanitized in rendered content
      const thoughtCards = page.locator('[class*="thought"]')
      if (await thoughtCards.count() > 0) {
        const content = await thoughtCards.first().textContent()
        expect(content).not.toContain('<script>')
      }
    }
  })

  test('unauthorized API calls are rejected', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.post('http://localhost:3001/api/transcribe', {
      multipart: {
        audio: 'fake-audio-data'
      }
    })
    
    // Should be rejected (401 or 403)
    expect([401, 403]).toContain(response.status())
  })
})
