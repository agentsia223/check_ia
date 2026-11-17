import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { SESSION_KEY_PATTERN, getSupabase, mayHaveSession } from "../lib/supabase";
import { claimAnonChecks } from "../lib/checks";

/**
 * Auth context value (see useAuth). Exported so tests can provide a fake value:
 * `<AuthContext.Provider value={{user, isLoggedIn, loading, signIn, …}}>`.
 */
export const AuthContext = createContext(null);

const UNAVAILABLE = {
    ok: false,
    message: "Le service de connexion est indisponible pour le moment. Réessayez plus tard.",
};

// The French messages load with the first failed auth action (kept out of the initial bundle).
const failure = async (error) => {
    const { toFrenchAuthError } = await import("./authErrors");
    return { ok: false, message: toFrenchAuthError(error) };
};

async function claimQuietly() {
    try {
        await claimAnonChecks();
    } catch {
        // Claiming is best effort: the check stays reachable by its link.
    }
}

/**
 * Provides the Supabase session to the app. Place inside QueryClientProvider so
 * signing out also clears cached private data.
 * @param {{children: React.ReactNode}} props
 */
export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    // Without a stored session there is nothing to wait for: signed out at once, and
    // Supabase (about 55 kB gzipped) is only loaded when an auth action needs it.
    const [loading, setLoading] = useState(() => mayHaveSession());
    const queryClient = useContext(QueryClientContext);
    const queryClientRef = useRef(queryClient);
    queryClientRef.current = queryClient;
    const connection = useRef(null);
    const unsubscribe = useRef(null);
    const unmounted = useRef(false);

    /** Load Supabase once, read the session and follow its changes. Resolves the client or null. */
    const connect = useCallback(() => {
        if (!connection.current) {
            connection.current = getSupabase()
                .then(async (client) => {
                    if (!client) return null;
                    const { data } = await client.auth.getSession();
                    if (!unmounted.current) setSession(data?.session ?? null);
                    const {
                        data: { subscription },
                    } = client.auth.onAuthStateChange((event, nextSession) => {
                        if (unmounted.current) return;
                        setSession(nextSession ?? null);
                        if (event === "SIGNED_OUT") queryClientRef.current?.clear();
                    });
                    unsubscribe.current = () => subscription.unsubscribe();
                    if (unmounted.current) unsubscribe.current();
                    return client;
                })
                .catch((error) => {
                    // A failed download (offline, stale chunk) may be retried by the next action.
                    connection.current = null;
                    throw error;
                });
        }
        return connection.current;
    }, []);

    useEffect(() => {
        unmounted.current = false;
        const finish = () => {
            if (!unmounted.current) setLoading(false);
        };
        if (mayHaveSession()) {
            connect().catch(() => {}).finally(finish);
        }
        // A sign-in in another tab writes the session key: connect then.
        const onStorage = (event) => {
            if (event.key && SESSION_KEY_PATTERN.test(event.key) && event.newValue) connect().catch(() => {});
        };
        window.addEventListener("storage", onStorage);
        return () => {
            unmounted.current = true;
            window.removeEventListener("storage", onStorage);
            if (unsubscribe.current) {
                unsubscribe.current();
                unsubscribe.current = null;
                connection.current = null;
            }
        };
    }, [connect]);

    const run = useCallback(async (action) => {
        try {
            const client = await connect();
            if (!client) return UNAVAILABLE;
            return await action(client.auth);
        } catch (error) {
            return failure(error);
        }
    }, [connect]);

    const signIn = useCallback(
        (email, password) =>
            run(async (auth) => {
                const { error } = await auth.signInWithPassword({ email, password });
                if (error) return failure(error);
                await claimQuietly();
                return { ok: true };
            }),
        [run]
    );

    const signUp = useCallback(
        (email, password) =>
            run(async (auth) => {
                const { data, error } = await auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/connexion` },
                });
                if (error) return failure(error);
                // With e-mail confirmation on, Supabase answers an existing address with a
                // user that has no identities instead of an error.
                if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                    return failure({ code: "user_already_exists" });
                }
                if (data?.session) await claimQuietly();
                return { ok: true, hasSession: Boolean(data?.session) };
            }),
        [run]
    );

    const signOut = useCallback(
        () =>
            run(async (auth) => {
                const { error } = await auth.signOut();
                return error ? failure(error) : { ok: true };
            }),
        [run]
    );

    const sendPasswordReset = useCallback(
        (email) =>
            run(async (auth) => {
                const { error } = await auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reinitialiser`,
                });
                return error ? failure(error) : { ok: true };
            }),
        [run]
    );

    const updatePassword = useCallback(
        (password) =>
            run(async (auth) => {
                const { error } = await auth.updateUser({ password });
                return error ? failure(error) : { ok: true };
            }),
        [run]
    );

    const accessToken = session?.access_token ?? null;
    const getAccessToken = useCallback(() => accessToken, [accessToken]);

    const value = useMemo(() => {
        const user = session?.user ?? null;
        return {
            user,
            isLoggedIn: Boolean(user),
            loading,
            signIn,
            signUp,
            signOut,
            sendPasswordReset,
            updatePassword,
            getAccessToken,
        };
    }, [session, loading, signIn, signUp, signOut, sendPasswordReset, updatePassword, getAccessToken]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * @returns {{user: object|null, isLoggedIn: boolean, loading: boolean,
 *   signIn(email: string, password: string): Promise<{ok: boolean, message?: string}>,
 *   signUp(email: string, password: string): Promise<{ok: boolean, message?: string}>,
 *   signOut(): Promise<{ok: boolean, message?: string}>,
 *   sendPasswordReset(email: string): Promise<{ok: boolean, message?: string}>,
 *   updatePassword(password: string): Promise<{ok: boolean, message?: string}>,
 *   getAccessToken(): string|null}}
 *   signUp resolves `{ok: true, hasSession}`; hasSession is false when the user must confirm their e-mail.
 */
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
    return value;
}
