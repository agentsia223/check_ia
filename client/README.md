# Check-IA web client

React 18 + Vite, CSS Modules on the tokens in `src/styles/tokens.css`, TanStack Query, Supabase auth. Node 22.12 or later.

## Scripts

- `npm run dev` — development server. Add `VITE_MOCK_API=1` to use the in-memory mock API (no backend needed).
- `npm test` — Vitest. `npm test -- --coverage` enforces 80 % lines and statements.
- `npm run build` — production build into `build/`.
- `npm start` — serves `build/` on `$PORT` (Railway).

## Environment

`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_API_URL` (see `.env.example`), read through `import.meta.env`.
