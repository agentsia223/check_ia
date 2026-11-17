# Frontend Tests

Frontend tests use **Vitest** (configured in `client/vite.config.js`) and **React Testing Library**.

## Running Tests

```bash
cd client
npm test
```

`npm test` runs `vitest run` once (no watch mode); use `npx vitest` to watch.

### With Coverage

```bash
cd client
npx vitest run --coverage
```

## Test Structure

```
client/src/
├── App.test.js             # Main app smoke test
├── test/setup.js           # jest-dom matchers and jsdom shims
└── components/
    └── __tests__/          # Component-level tests (optional)
```

## Writing New Tests

1. Create test files alongside components or in a `__tests__/` directory
2. Use `@testing-library/react` for rendering and querying
3. Mock the Supabase client for any components that use authentication
4. Focus on user-visible behavior rather than implementation details

### Example

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '../MyComponent';

test('displays the expected heading', () => {
  render(
    <BrowserRouter>
      <MyComponent />
    </BrowserRouter>
  );
  expect(screen.getByRole('heading')).toBeInTheDocument();
});
```

## Mocking Supabase

Components that use the Supabase client need it mocked in tests:

```javascript
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    }
  }
}));
```
