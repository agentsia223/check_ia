import React, { useContext } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthContext, AuthProvider } from "./AuthContext";
import { supabase, getCurrentSession } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
    supabase: {
        auth: {
            onAuthStateChange: jest.fn(),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
        },
    },
    getCurrentSession: jest.fn(),
}));

function Consumer() {
    const auth = useContext(AuthContext);

    return (
        <div>
            <span data-testid="loading">{String(auth.loading)}</span>
            <span data-testid="logged-in">{String(auth.isLoggedIn)}</span>
            <span data-testid="token">{auth.getAccessToken() || "none"}</span>
            <button onClick={() => auth.login("user@example.com", "password")}>login</button>
            <button onClick={() => auth.register("user@example.com", "password", { data: { name: "User" } })}>
                register
            </button>
            <button onClick={() => auth.logout()}>logout</button>
        </div>
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    getCurrentSession.mockResolvedValue({
        session: {
            access_token: "initial-token",
            user: { id: "user-1", email: "user@example.com" },
        },
    });
    supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
    supabase.auth.signUp.mockResolvedValue({ data: { user: {} }, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
});

test("auth provider loads the current session and exposes auth helpers", async () => {
    render(
        <AuthProvider>
            <Consumer />
        </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("initial-token");

    await act(async () => {
        screen.getByRole("button", { name: "login" }).click();
        screen.getByRole("button", { name: "register" }).click();
        screen.getByRole("button", { name: "logout" }).click();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password",
    });
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password",
        options: { data: { name: "User" } },
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
});

test("auth provider reacts to signed-out auth events", async () => {
    let authChangeHandler;
    supabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
        <AuthProvider>
            <Consumer />
        </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("logged-in")).toHaveTextContent("true"));

    await act(async () => {
        await authChangeHandler("SIGNED_OUT", null);
    });

    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
});
