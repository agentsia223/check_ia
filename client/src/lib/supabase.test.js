const mockAuth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
};

jest.mock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => ({ auth: mockAuth })),
}));

const {
    getCurrentSession,
    getCurrentUser,
    signIn,
    signOut,
    signUp,
} = require("./supabase");

beforeEach(() => {
    jest.clearAllMocks();
});

test("supabase auth helpers delegate to the configured client", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: "user" }, error: null });
    mockAuth.signUp.mockResolvedValue({ data: { user: "new-user" }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    mockAuth.getUser.mockResolvedValue({ data: { user: "current-user" }, error: null });
    mockAuth.getSession.mockResolvedValue({ data: { session: "session" }, error: null });

    await expect(signIn("user@example.com", "password")).resolves.toEqual({
        data: { user: "user" },
        error: null,
    });
    await expect(signUp("user@example.com", "password", { data: { name: "User" } })).resolves.toEqual({
        data: { user: "new-user" },
        error: null,
    });
    await expect(signOut()).resolves.toEqual({ error: null });
    await expect(getCurrentUser()).resolves.toEqual({ user: "current-user", error: null });
    await expect(getCurrentSession()).resolves.toEqual({ session: "session", error: null });
});

