// Supabase is loaded on demand so it stays out of the initial bundle. Visitors with no
// stored session never download it until they open a sign-in action (spec section 8).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

let clientPromise = null;

/** supabase-js keeps the session in localStorage under "sb-<project>-auth-token". */
export const SESSION_KEY_PATTERN = /^sb-.+-auth-token/;

/**
 * Could this browser hold a Supabase session right now? True once the client is loaded,
 * when a stored session key exists, or when the URL carries an auth redirect (e-mail
 * confirmation or password-reset link). False means: signed out, no need to load Supabase.
 * @returns {boolean}
 */
export function mayHaveSession() {
    if (clientPromise) return true;
    try {
        for (let index = 0; index < window.localStorage.length; index += 1) {
            if (SESSION_KEY_PATTERN.test(window.localStorage.key(index) ?? "")) return true;
        }
    } catch {
        // Storage blocked: supabase-js would keep the session in memory only, so none is stored.
    }
    const { hash = "", search = "" } = window.location ?? {};
    return (
        /(^|[#&])(access_token|refresh_token|error_description)=/.test(hash) ||
        /[?&](code|token_hash|error_description)=/.test(search)
    );
}

/**
 * Lazily create the Supabase client.
 * @returns {Promise<import("@supabase/supabase-js").SupabaseClient | null>}
 *   null when the Supabase variables are not set (tests, mock preview).
 */
export function getSupabase() {
    if (!clientPromise) {
        clientPromise =
            SUPABASE_URL && SUPABASE_ANON_KEY
                ? import("@supabase/supabase-js").then(({ createClient }) =>
                      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
                  )
                : Promise.resolve(null);
    }
    return clientPromise;
}

/** @returns {Promise<object | null>} the current session, or null (without loading Supabase when there is none). */
export async function getSession() {
    if (!mayHaveSession()) return null;
    const client = await getSupabase();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
}

/**
 * Is this refresh failure transient (network, timeout, server error) rather than a
 * refusal of the refresh token? supabase-js marks those as AuthRetryableFetchError.
 */
function isTransient(error) {
    if (!error) return false;
    if (error.name === "AuthRetryableFetchError") return true;
    if (typeof error.status === "number" && (error.status === 0 || error.status >= 500)) return true;
    // A thrown TypeError ("Failed to fetch") or another non-auth exception.
    return !(typeof error.name === "string" && error.name.startsWith("Auth"));
}

/**
 * Refresh the session once and say why it failed.
 * @returns {Promise<{session: object|null, failure: null|"auth"|"network"}>}
 *   failure "auth": the refresh token was refused (sign out); "network": try again later.
 */
export async function refreshSessionDetailed() {
    const client = await getSupabase();
    if (!client) return { session: null, failure: "auth" };
    try {
        const { data, error } = await client.auth.refreshSession();
        if (error) return { session: null, failure: isTransient(error) ? "network" : "auth" };
        const session = data?.session ?? null;
        return { session, failure: session ? null : "auth" };
    } catch (error) {
        return { session: null, failure: isTransient(error) ? "network" : "auth" };
    }
}

/** Refresh the session once. @returns {Promise<object | null>} the new session, or null on failure. */
export async function refreshSession() {
    return (await refreshSessionDetailed()).session;
}

/** Drop the local session (used when the API keeps refusing the token). */
export async function signOutLocal() {
    if (!mayHaveSession()) return;
    const client = await getSupabase();
    if (!client) return;
    try {
        await client.auth.signOut({ scope: "local" });
    } catch {
        // The session is already unusable; nothing else to do.
    }
}
