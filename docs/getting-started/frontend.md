# Frontend Setup

The frontend is a React 18 application built with Create React App and Material-UI.

## Install Dependencies

```bash
cd client
npm install
```

## Configure Environment

Create a `.env` file in the `client/` directory:

```bash
REACT_APP_SUPABASE_URL=<your-supabase-project-url>
REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>
REACT_APP_API_URL=http://localhost:8000
```

## Start the Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`.

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `client/build/` directory, ready for deployment.

## Key Frontend Dependencies

- **React 18** — UI framework
- **Material-UI 6** (`@mui/material`) — Component library
- **React Router 6** — Client-side routing
- **Axios** — HTTP client for API calls
- **Supabase JS** — Authentication client
- **React Toastify** — Notification system
