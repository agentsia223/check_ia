import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./AuthContext";
import { getSupabase, mayHaveSession } from "../lib/supabase";
import { claimAnonChecks } from "../lib/checks";

vi.mock("../lib/supabase", () => ({
    getSupabase: vi.fn(),
    mayHaveSession: vi.fn(() => true),
    SESSION_KEY_PATTERN: /^sb-.+-auth-token/,
}));
vi.mock("../lib/checks", () => ({ claimAnonChecks: vi.fn() }));

let authListener;
let fakeAuth;

const makeClient = (session = null) => {
    authListener = null;
    fakeAuth = {
        getSession: vi.fn(() => Promise.resolve({ data: { session } })),
        onAuthStateChange: vi.fn((cb) => {
            authListener = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signInWithPassword: vi.fn(() =>
            Promise.resolve({ data: { session: { access_token: "t" } }, error: null })
        ),
        signUp: vi.fn(() =>
            Promise.resolve({
                data: { user: { id: "u", identities: [{}] }, session: null },
                error: null,
            })
        ),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
        resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
        updateUser: vi.fn(() => Promise.resolve({ error: null })),
    };
    return { auth: fakeAuth };
};

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const renderAuth = async (session = null) => {
    getSupabase.mockResolvedValue(makeClient(session));
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
};

beforeEach(() => {
    claimAnonChecks.mockResolvedValue({ claimed: 0 });
    mayHaveSession.mockReturnValue(true);
});

afterEach(() => {
    vi.clearAllMocks();
});

test("starts loading, then exposes the stored session", async () => {
    const session = { access_token: "abc", user: { id: "u1", email: "awa@example.org" } };
    const { result } = await renderAuth(session);

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user.email).toBe("awa@example.org");
    expect(result.current.getAccessToken()).toBe("abc");
});

test("signed out by default", async () => {
    const { result } = await renderAuth(null);
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.getAccessToken()).toBeNull();
});

test("follows auth state changes", async () => {
    const { result } = await renderAuth(null);

    act(() => authListener("SIGNED_IN", { access_token: "n", user: { id: "u2", email: "b@c.d" } }));
    expect(result.current.isLoggedIn).toBe(true);

    act(() => authListener("SIGNED_OUT", null));
    expect(result.current.isLoggedIn).toBe(false);
});

test("signIn succeeds and claims anonymous checks", async () => {
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
        outcome = await result.current.signIn("awa@example.org", "secret123");
    });

    expect(outcome).toEqual({ ok: true });
    expect(fakeAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "awa@example.org",
        password: "secret123",
    });
    expect(claimAnonChecks).toHaveBeenCalledTimes(1);
});

test("signIn failure returns a French message and does not claim", async () => {
    const { result } = await renderAuth();
    fakeAuth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });

    let outcome;
    await act(async () => {
        outcome = await result.current.signIn("a@b.c", "bad");
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toMatch(/incorrect/i);
    expect(claimAnonChecks).not.toHaveBeenCalled();
});

test("a failing claim does not fail the sign-in", async () => {
    const { result } = await renderAuth();
    claimAnonChecks.mockRejectedValue(new Error("network"));

    let outcome;
    await act(async () => {
        outcome = await result.current.signIn("a@b.c", "good-password");
    });
    expect(outcome).toEqual({ ok: true });
});

test("signUp without a session (email confirmation) succeeds without claiming", async () => {
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
        outcome = await result.current.signUp("new@example.org", "secret123");
    });

    expect(outcome).toEqual({ ok: true, hasSession: false });
    expect(fakeAuth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.org", password: "secret123" })
    );
    expect(claimAnonChecks).not.toHaveBeenCalled();
});

test("signUp with an immediate session claims anonymous checks", async () => {
    const { result } = await renderAuth();
    fakeAuth.signUp.mockResolvedValue({
        data: { user: { id: "u", identities: [{}] }, session: { access_token: "s" } },
        error: null,
    });

    let outcome;
    await act(async () => {
        outcome = await result.current.signUp("new@example.org", "secret123");
    });
    expect(outcome).toEqual({ ok: true, hasSession: true });
    expect(claimAnonChecks).toHaveBeenCalledTimes(1);
});

test("signUp for an existing address returns the already-registered message", async () => {
    const { result } = await renderAuth();
    fakeAuth.signUp.mockResolvedValue({
        data: { user: { id: "u", identities: [] }, session: null },
        error: null,
    });

    let outcome;
    await act(async () => {
        outcome = await result.current.signUp("old@example.org", "secret123");
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toMatch(/compte existe déjà/i);
});

test("signUp error is translated", async () => {
    const { result } = await renderAuth();
    fakeAuth.signUp.mockResolvedValue({ data: {}, error: { code: "weak_password" } });

    let outcome;
    await act(async () => {
        outcome = await result.current.signUp("x@example.org", "1");
    });
    expect(outcome).toEqual({ ok: false, message: expect.stringMatching(/trop faible/i) });
});

test("signOut, sendPasswordReset and updatePassword resolve ok", async () => {
    const { result } = await renderAuth({ access_token: "a", user: { id: "u" } });

    await act(async () => {
        await expect(result.current.signOut()).resolves.toEqual({ ok: true });
        await expect(result.current.sendPasswordReset("a@b.c")).resolves.toEqual({ ok: true });
        await expect(result.current.updatePassword("nouveau-mdp")).resolves.toEqual({ ok: true });
    });

    expect(fakeAuth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.c", {
        redirectTo: `${window.location.origin}/reinitialiser`,
    });
    expect(fakeAuth.updateUser).toHaveBeenCalledWith({ password: "nouveau-mdp" });
});

test("auth action errors are translated", async () => {
    const { result } = await renderAuth();
    fakeAuth.signOut.mockResolvedValue({ error: { message: "Failed to fetch" } });
    fakeAuth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429 } });
    fakeAuth.updateUser.mockRejectedValue(new Error("Auth session missing!"));

    await act(async () => {
        expect((await result.current.signOut()).message).toMatch(/connexion/i);
        expect((await result.current.sendPasswordReset("a@b.c")).message).toMatch(/trop de tentatives/i);
        expect((await result.current.updatePassword("x")).message).toMatch(/lien a expiré/i);
    });
});

test("without a configured auth service, actions fail with a French message", async () => {
    getSupabase.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
        outcome = await result.current.signIn("a@b.c", "x");
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toMatch(/indisponible/i);
});

test("a failure loading the auth client ends loading signed out", async () => {
    getSupabase.mockRejectedValue(new Error("chunk"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
});

test("signing out clears the query cache", async () => {
    getSupabase.mockResolvedValue(makeClient({ access_token: "a", user: { id: "u1" } }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(["checks", "mine"], { results: [1] });

    render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <p>app</p>
            </AuthProvider>
        </QueryClientProvider>
    );
    await screen.findByText("app");
    await waitFor(() => expect(authListener).toBeTypeOf("function"));

    act(() => authListener("SIGNED_OUT", null));
    expect(queryClient.getQueryData(["checks", "mine"])).toBeUndefined();
});

test("useAuth outside a provider throws a clear error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const silence = (event) => event.preventDefault();
    window.addEventListener("error", silence);
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    window.removeEventListener("error", silence);
    console.error.mockRestore();
});

describe("without a stored session", () => {
    beforeEach(() => mayHaveSession.mockReturnValue(false));

    test("is signed out at once and does not load Supabase", () => {
        getSupabase.mockResolvedValue(makeClient());
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.loading).toBe(false);
        expect(result.current.isLoggedIn).toBe(false);
        expect(getSupabase).not.toHaveBeenCalled();
    });

    test("an auth action loads Supabase, then follows the session", async () => {
        getSupabase.mockResolvedValue(makeClient());
        const { result } = renderHook(() => useAuth(), { wrapper });
        let outcome;
        await act(async () => {
            outcome = await result.current.signIn("awa@example.org", "secret123");
        });
        expect(outcome).toEqual({ ok: true });
        expect(getSupabase).toHaveBeenCalledTimes(1);
        expect(fakeAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
        act(() => authListener("SIGNED_IN", { access_token: "t", user: { id: "u", email: "awa@example.org" } }));
        expect(result.current.isLoggedIn).toBe(true);
    });

    test("a sign-in in another tab (storage event) connects", async () => {
        getSupabase.mockResolvedValue(makeClient({ access_token: "t", user: { id: "u", email: "a@b.ml" } }));
        const { result } = renderHook(() => useAuth(), { wrapper });
        act(() => {
            window.dispatchEvent(new StorageEvent("storage", { key: "sb-projet-auth-token", newValue: "{}" }));
        });
        await waitFor(() => expect(result.current.isLoggedIn).toBe(true));
    });
});
