# Testing Quick Start Guide

## Prerequisites

1. Install dependencies:
```bash
cd frontend && npm install
cd ../backend && npm install
```

2. Install Playwright browsers (one-time setup):
```bash
cd frontend
npx playwright install chromium
```

## Running Tests

### Quick Test Run
```bash
# Frontend unit tests
cd frontend
npm test

# Backend unit tests  
cd backend
npm test

# E2E tests (requires dev server running)
cd frontend
npm run dev  # In one terminal
npm run test:e2e  # In another terminal
```

### Test Commands Reference

**Frontend:**
- `npm test` - Run unit tests once
- `npm run test:watch` - Watch mode for development
- `npm run test:ui` - Open Vitest UI
- `npm run test:coverage` - Generate coverage report
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - E2E tests with UI

**Backend:**
- `npm test` - Run tests once
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report

## Test Structure

```
frontend/
├── src/
│   ├── __tests__/          # Unit tests (co-located with source)
│   │   ├── setup.ts        # Test configuration
│   │   ├── mocks/          # MSW handlers
│   │   └── utils/          # Test utilities
│   └── [components]/__tests__/
└── tests/
    └── e2e/                # End-to-end tests

backend/
└── __tests__/              # Backend tests
    └── routes/              # Route tests
```

## Writing Your First Test

### Frontend Component Test

Create `src/components/__tests__/MyComponent.test.jsx`:

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

### Backend Route Test

Create `backend/__tests__/routes/myRoute.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import myRouter from '../../routes/myRoute.js'

const app = express()
app.use(express.json())
app.use('/api/myroute', myRouter)

describe('MyRoute', () => {
  it('handles GET request', async () => {
    const response = await request(app)
      .get('/api/myroute')
    
    expect(response.status).toBe(200)
  })
})
```

## Common Issues

### Tests fail with "Cannot find module"
- Run `npm install` in the relevant directory
- Clear `node_modules` and reinstall if needed

### E2E tests timeout
- Ensure dev server is running (`npm run dev`)
- Check `PLAYWRIGHT_BASE_URL` environment variable
- Increase timeout in `playwright.config.js`

### Coverage not showing
- Run `npm run test:coverage` explicitly
- Check `vitest.config.js` coverage settings

## Next Steps

1. Read [TESTING.md](./TESTING.md) for comprehensive guide
2. Review existing tests for patterns
3. Add tests for new features as you build them
4. Run tests before committing code
