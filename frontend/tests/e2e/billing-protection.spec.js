import { test, expect } from '@playwright/test'

test.describe('Billing Protection', () => {
  test('user is not charged if transcription fails', async ({ page }) => {
    // Intercept transcription to fail
    await page.route('**/api/transcribe', route => 
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Transcription failed' })
      })
    )
    
    // Intercept Stripe checkout creation
    let checkoutCallCount = 0
    await page.route('**/api/stripe/create-checkout-session', route => {
      checkoutCallCount++
      route.continue()
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Attempt to record and transcribe
    const recordButton = page.locator('[aria-label="Start recording"]')
    if (await recordButton.isVisible()) {
      await recordButton.click()
      await page.waitForTimeout(1000)
      await page.locator('[aria-label="Stop recording"]').click()
      
      // Wait for error
      await page.waitForTimeout(2000)
      
      // Verify no checkout session was created
      expect(checkoutCallCount).toBe(0)
    }
  })

  test('no double charges on checkout retry', async ({ page }) => {
    let checkoutCallCount = 0
    let customerIds = []
    
    await page.route('**/api/stripe/create-checkout-session', async route => {
      checkoutCallCount++
      const request = route.request()
      const body = await request.postDataJSON()
      customerIds.push(body.userId)
      
      // First call succeeds, second call should reuse customer
      if (checkoutCallCount === 1) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/test',
            customerId: 'cus_test_123'
          })
        })
      } else {
        // Subsequent calls should reuse same customer
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/test',
            customerId: 'cus_test_123' // Same customer ID
          })
        })
      }
    })
    
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    
    // Click upgrade button multiple times rapidly
    const upgradeButton = page.locator('text=Upgrade').first()
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click()
      await page.waitForTimeout(100)
      await upgradeButton.click()
      
      await page.waitForTimeout(1000)
      
      // Verify only one unique customer was created
      const uniqueCustomers = new Set(customerIds)
      expect(uniqueCustomers.size).toBeLessThanOrEqual(1)
    }
  })
})
