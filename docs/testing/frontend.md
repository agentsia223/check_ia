# Frontend Tests

Frontend tests use **Jest** and **React Testing Library**, included by default with Create React App.

## Running Tests

```bash
cd client
npm test -- --watchAll=false
```

### With Coverage

```bash
cd client
npm test -- --watchAll=false --coverage
```

## Test Structure

```
client/src/
├── App.test.js             # Main app smoke test
├── setupTests.js           # Jest DOM setup
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
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    }
  }
}));
```
