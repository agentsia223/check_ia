import React from 'react';
import { render } from '@testing-library/react';

// Prevent createClient() from crashing when components import supabase.js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
    },
  })),
}));

// Mock AuthContext to bypass all Supabase auth logic in the provider
jest.mock('./utils/AuthContext', () => {
  const React = require('react');
  const AuthContext = React.createContext();
  const AuthProvider = ({ children }) => (
    <AuthContext.Provider
      value={{
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        isLoggedIn: false,
        getAccessToken: jest.fn(() => null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
  return { AuthContext, AuthProvider };
});

const App = require('./App').default;

test('App component renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
