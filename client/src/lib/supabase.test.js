const auth = {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
};
const createClient = vi.fn(() => ({ auth }));

async function load({ url = "https://projet.supabase.co", key = "cle-publique" } = {}) {
    vi.resetModules();
    vi.doMock("./config", () => ({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }));
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    return import("./supabase");
}

afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    vi.doUnmock("./config");
    vi.doUnmock("@supabase/supabase-js");
});

test("creates one client lazily from the configured variables", async () => {
    const mod = await load();
    const first = await mod.getSupabase();
    const second = await mod.getSupabase();

    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith("https://projet.supabase.co", "cle-publique");
});

test("returns null and safe defaults when auth is not configured", async () => {
    const mod = await load({ url: "", key: "" });

    await expect(mod.getSupabase()).resolves.toBeNull();
    await expect(mod.getSession()).resolves.toBeNull();
    await expect(mod.refreshSession()).resolves.toBeNull();
    await expect(mod.signOutLocal()).resolves.toBeUndefined();
    expect(createClient).not.toHaveBeenCalled();
});

test("session helpers delegate to the client", async () => {
    const mod = await load();
    window.localStorage.setItem("sb-projet-auth-token", "{}");
    auth.getSession.mockResolvedValue({ data: { session: { access_token: "a" } } });
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: "b" } }, error: null });
    auth.signOut.mockResolvedValue({ error: null });

    await expect(mod.getSession()).resolves.toEqual({ access_token: "a" });
    await expect(mod.refreshSession()).resolves.toEqual({ access_token: "b" });
    await mod.signOutLocal();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
});

test("refresh and sign-out failures are absorbed", async () => {
    const mod = await load();
    auth.refreshSession.mockResolvedValueOnce({ data: {}, error: { message: "expired" } });
    await expect(mod.refreshSession()).resolves.toBeNull();

    auth.refreshSession.mockRejectedValueOnce(new Error("network"));
    await expect(mod.refreshSession()).resolves.toBeNull();

    auth.getSession.mockResolvedValue({ data: {} });
    await expect(mod.getSession()).resolves.toBeNull();

    auth.signOut.mockRejectedValue(new Error("network"));
    await expect(mod.signOutLocal()).resolves.toBeUndefined();
});

test("refreshSessionDetailed tells a refused token from a network failure", async () => {
    const mod = await load();
    const authError = Object.assign(new Error("Invalid Refresh Token"), { name: "AuthApiError", status: 400 });
    const retryable = Object.assign(new Error("Failed to fetch"), { name: "AuthRetryableFetchError", status: 0 });
    const serverError = Object.assign(new Error("Bad gateway"), { name: "AuthUnknownError", status: 502 });

    auth.refreshSession.mockResolvedValueOnce({ data: { session: { access_token: "n" } }, error: null });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: { access_token: "n" }, failure: null });

    auth.refreshSession.mockResolvedValueOnce({ data: {}, error: authError });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "auth" });

    auth.refreshSession.mockResolvedValueOnce({ data: {}, error: retryable });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "network" });

    auth.refreshSession.mockResolvedValueOnce({ data: {}, error: serverError });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "network" });

    auth.refreshSession.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "network" });

    auth.refreshSession.mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "AuthSessionMissingError" }));
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "auth" });

    auth.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "auth" });
});

test("refreshSessionDetailed without auth configured is an auth failure", async () => {
    const mod = await load({ url: "", key: "" });
    await expect(mod.refreshSessionDetailed()).resolves.toEqual({ session: null, failure: "auth" });
});

describe("mayHaveSession: Supabase is not loaded for visitors without a session", () => {
    test("false with no stored session and no auth redirect; getSession does not load the client", async () => {
        const mod = await load();
        window.localStorage.setItem("checkia.anon", "abc");
        expect(mod.mayHaveSession()).toBe(false);
        await expect(mod.getSession()).resolves.toBeNull();
        await mod.signOutLocal();
        expect(createClient).not.toHaveBeenCalled();
    });

    test("true with a stored supabase-js session", async () => {
        const mod = await load();
        window.localStorage.setItem("sb-projet-auth-token", "{}");
        expect(mod.mayHaveSession()).toBe(true);
    });

    test.each([
        ["/reinitialiser#access_token=x&type=recovery"],
        ["/connexion?code=abc"],
        ["/connexion#error_description=expired"],
    ])("true when the URL is an auth redirect (%s)", async (url) => {
        const mod = await load();
        window.history.replaceState(null, "", url);
        expect(mod.mayHaveSession()).toBe(true);
    });

    test("true once the client has been loaded", async () => {
        const mod = await load();
        await mod.getSupabase();
        expect(mod.mayHaveSession()).toBe(true);
    });
});
