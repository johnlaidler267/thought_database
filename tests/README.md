# Running Tests

This project has three types of tests: frontend unit tests, frontend E2E tests, and backend tests.

## Quick Start

**Run all tests from the root directory:**
```bash
npm test              # Run all unit tests (frontend + backend)
npm run test:all      # Run unit tests, then E2E tests
```

## Individual Test Suites

### Frontend Unit Tests
Tests for components, hooks, and services.

```bash
# From root
npm run test:frontend

# Or from frontend directory
cd frontend
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # Open Vitest UI
npm run test:coverage # Coverage report
```

### Frontend E2E Tests
End-to-end user interaction tests.

```bash
# From root
npm run test:e2e

# Or from frontend directory
cd frontend
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # E2E tests with UI
```

**Note:** E2E tests require the dev server to be running:
```bash
# Terminal 1
npm run dev:frontend

# Terminal 2
npm run test:e2e
```

### Backend Tests
API route and backend logic tests.

```bash
# From root
npm run test:backend

# Or from backend directory
cd backend
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Test Locations

- **Frontend Unit Tests**: `frontend/src/**/__tests__/`
- **Frontend E2E Tests**: `frontend/tests/e2e/`
- **Backend Tests**: `backend/__tests__/`

## More Information

For detailed testing documentation, see:
- [TESTING_QUICK_START.md](../TESTING_QUICK_START.md) - Quick reference
- [TESTING.md](../TESTING.md) - Comprehensive guide
