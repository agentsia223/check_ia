// Build-time configuration. Variable names are shared with the Railway setup.

const withSlash = (url) => (url.endsWith("/") ? url : `${url}/`);

/** Base URL of the Django API, always ending with "/". */
export const API_BASE_URL = withSlash(
    import.meta.env.REACT_APP_API_URL || "http://localhost:8000/api/"
);

/** True when the app runs against the in-memory mock API (`VITE_MOCK_API=1`). */
export const MOCK_API = import.meta.env.VITE_MOCK_API === "1";

/** Supabase project URL; empty when auth is not configured. */
export const SUPABASE_URL = import.meta.env.REACT_APP_SUPABASE_URL || "";

/** Supabase anonymous (public) key; empty when auth is not configured. */
export const SUPABASE_ANON_KEY = import.meta.env.REACT_APP_SUPABASE_ANON_KEY || "";
