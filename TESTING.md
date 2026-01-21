# Testing Guide

This document outlines the comprehensive testing strategy for the Thought Database application.

## Test Structure

```
thought_database/
├── frontend/
│   ├── src/
│   │   ├── __tests__/          # Unit tests
│   │   │   ├── setup.ts        # Test configuration
│   │   │   ├── mocks/          # MSW handlers
│   │   │   └── utils/          # Test utilities
│   │   └── [components]/__tests__/
│   └── tests/
│       └── e2e/                # End-to-end tests
├── backend/
│   └── __tests__/              # Backend unit/integration tests
└── .github/
    └── workflows/              # CI/CD workflows
```

## Running Tests

### Frontend Tests

```bash
# Unit tests
cd frontend
npm test

# Unit tests with UI
npm run test:ui

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

### Backend Tests

```bash
# Unit tests
cd backend
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Categories

### 1. Unit Tests
- **Location**: `frontend/src/**/__tests__/*.test.{js,jsx}`
- **Purpose**: Test individual components, hooks, and utilities in isolation
- **Coverage Goal**: 80%+

### 2. Integration Tests
- **Location**: `backend/__tests__/routes/*.test.js`
- **Purpose**: Test API endpoints and backend logic
- **Coverage Goal**: Critical paths 100%

### 3. E2E Tests
- **Location**: `frontend/tests/e2e/*.spec.js`
- **Purpose**: Test complete user flows
- **Critical Scenarios**:
  - Data loss prevention
  - Billing protection
  - Security/auth
  - Recording and transcription flow

## Critical Test Scenarios

### Data Loss Prevention
- ✅ Transcript persists through network failure
- ✅ Transcript persists through page refresh
- ✅ No data loss when recording hits 5-minute limit
- ✅ Transcript survives browser navigation

### Billing Protection
- ✅ User not charged if transcription fails
- ✅ No double charges on checkout retry
- ✅ Refund issued if service fails after payment
- ✅ Subscription cancellation prevents future charges

### Security
- ✅ Users cannot access other users' thoughts
- ✅ Unauthorized API calls are rejected
- ✅ XSS prevention in transcript content
- ✅ CSRF protection on state-changing operations

## Writing New Tests

### Frontend Unit Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { render as customRender } from '@/__tests__/utils/test-utils'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    customRender(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Backend Test Example

```javascript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../server'

describe('POST /api/endpoint', () => {
  it('should handle valid request', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
    
    expect(response.status).toBe(200)
  })
})
```

### E2E Test Example

```javascript
import { test, expect } from '@playwright/test'

test('user can record and save thought', async ({ page }) => {
  await page.goto('/')
  await page.click('[aria-label="Start recording"]')
  await page.waitForTimeout(2000)
  await page.click('[aria-label="Stop recording"]')
  
  await expect(page.locator('textarea')).toBeVisible()
})
```

## Mocking

### MSW (Mock Service Worker)
- Used for API mocking in unit tests
- Handlers defined in `src/__tests__/mocks/handlers.ts`
- Automatically intercepts fetch requests

### Playwright Route Mocking
- Used for E2E tests
- Allows testing error scenarios
- Example: `await page.route('**/api/transcribe', route => route.abort())`

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Daily E2E test runs (2 AM UTC)

## Test Data Management

- Use test factories for consistent test data
- Clean up test data after each test
- Use separate test database/Stripe test mode

## Coverage Reports

Coverage reports are generated automatically:
- Unit tests: `npm run test:coverage`
- Reports available in `coverage/` directory
- Uploaded to Codecov in CI

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Isolation**: Each test should be independent
4. **Descriptive Names**: Test names should describe what they test
5. **Critical Paths First**: Prioritize tests for data loss, billing, security
6. **Mock External Services**: Don't hit real APIs in tests
7. **Clean Up**: Always clean up after tests

## Troubleshooting

### Tests failing locally but passing in CI
- Check environment variables
- Ensure all dependencies are installed
- Clear node_modules and reinstall

### E2E tests timing out
- Increase timeout in playwright.config.js
- Check if dev server is running
- Verify network conditions

### Coverage not updating
- Run `npm run test:coverage` explicitly
- Check coverage provider configuration
- Ensure test files are included in config

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing for API endpoints
- [ ] Accessibility testing (a11y)
- [ ] Cross-browser E2E testing matrix
