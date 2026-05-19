import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import AIImageDetection from "./AIImageDetection";
import ImageContentVerification from "./ImageContentVerification";
import Library from "./Library";
import Login from "./Login";
import Privacy from "./Privacy";
import Register from "./Register";
import SubmitFact from "./SubmitFact";
import Terms from "./Terms";
import PrivateRoute from "../utils/PrivateRoute";
import { AuthContext } from "../utils/AuthContext";
import { supabase } from "../lib/supabase";

jest.mock("axios");

jest.mock("../lib/supabase", () => ({
    supabase: {
        auth: {
            getSession: jest.fn(() =>
                Promise.resolve({
                    data: { session: { access_token: "test-token" } },
                })
            ),
            onAuthStateChange: jest.fn(() => ({
                data: { subscription: { unsubscribe: jest.fn() } },
            })),
        },
    },
    getCurrentSession: jest.fn(() => Promise.resolve({ session: null })),
}));

jest.mock("react-toastify", () => ({
    ToastContainer: () => <div data-testid="toast-container" />,
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

const authValue = (overrides = {}) => ({
    user: { id: "user-1", email: "user@example.com" },
    session: { access_token: "test-token" },
    loading: false,
    login: jest.fn(() => Promise.resolve({ success: true })),
    register: jest.fn(() => Promise.resolve({ success: true })),
    logout: jest.fn(),
    isLoggedIn: true,
    getAccessToken: jest.fn(() => "test-token"),
    ...overrides,
});

const renderWithAuth = (ui, value = authValue()) =>
    render(
        <AuthContext.Provider value={value}>
            <BrowserRouter>{ui}</BrowserRouter>
        </AuthContext.Provider>
    );

beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
    });
    const fetchMock = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ task_id: "task-1" }),
        })
    );
    global.fetch = fetchMock;
    window.fetch = fetchMock;
});

afterEach(() => {
    delete global.fetch;
    delete window.fetch;
});

test("static legal pages render their core headings", () => {
    const { unmount } = render(<Privacy />);
    expect(screen.getByRole("heading", { level: 4, name: /politique de confidentialité/i })).toBeInTheDocument();
    unmount();

    render(<Terms />);
    expect(screen.getByRole("heading", { name: /conditions d'utilisation/i })).toBeInTheDocument();
});

test("private route redirects guests and renders children for authenticated users", () => {
    const { unmount } = render(
        <AuthContext.Provider value={authValue({ isLoggedIn: false, user: null })}>
            <MemoryRouter initialEntries={["/private"]}>
                <Routes>
                    <Route path="/login" element={<div>Login page</div>} />
                    <Route
                        path="/private"
                        element={
                            <PrivateRoute>
                                <div>Protected content</div>
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    unmount();

    render(
        <AuthContext.Provider value={authValue()}>
            <MemoryRouter initialEntries={["/private"]}>
                <Routes>
                    <Route
                        path="/private"
                        element={
                            <PrivateRoute>
                                <div>Protected content</div>
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
});

test("library shows an auth message for guests", async () => {
    renderWithAuth(<Library />, authValue({ isLoggedIn: false, user: null }));

    expect(
        await screen.findByText(/connectez-vous pour voir la liste des faits vérifiés/i)
    ).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
});

test("library fetches unique facts and paginates authenticated results", async () => {
    axios.get.mockResolvedValueOnce({
        data: [
            { id: 1, texte: "Fact one", date: "2026-01-01", source: "https://one.test", mots_cles: [{ mot: "santé" }] },
            { id: 2, texte: "Fact two", date: "2026-01-02", source: "", mots_cles: [] },
            { id: 3, texte: "Fact three", date: "2026-01-03", source: "https://three.test", mots_cles: [] },
            { id: 4, texte: "Fact four", date: "2026-01-04", source: "https://four.test", mots_cles: [] },
            { id: 5, texte: "Fact one", date: "2026-01-05", source: "https://duplicate.test", mots_cles: [] },
        ],
    });

    renderWithAuth(<Library />);

    expect(await screen.findByText("Fact one")).toBeInTheDocument();
    expect(screen.queryByText("Fact four")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    expect(await screen.findByText("Fact four")).toBeInTheDocument();
});

test("login displays authentication failures", async () => {
    const login = jest.fn(() =>
        Promise.resolve({ success: false, error: "Invalid credentials" })
    );
    renderWithAuth(<Login />, authValue({ login }));

    fireEvent.change(screen.getByPlaceholderText(/votre@email.com/i), {
        target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
        target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("bad@example.com", "wrong-password");
});

test("register validates mismatched passwords before calling auth", async () => {
    const register = jest.fn();
    renderWithAuth(<Register />, authValue({ register }));

    fireEvent.change(screen.getByPlaceholderText("Jean"), {
        target: { value: "Awa" },
    });
    fireEvent.change(screen.getByPlaceholderText("Dupont"), {
        target: { value: "Traoré" },
    });
    fireEvent.change(screen.getByPlaceholderText(/jean@example.com/i), {
        target: { value: "awa@example.com" },
    });
    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordFields[0], { target: { value: "password-1" } });
    fireEvent.change(passwordFields[1], { target: { value: "password-2" } });
    fireEvent.click(screen.getByRole("button", { name: /créer mon compte/i }));

    expect(await screen.findByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
});

test("submit fact requires auth and posts claims for authenticated users", async () => {
    const { rerender } = renderWithAuth(
        <SubmitFact />,
        authValue({ isLoggedIn: false, user: null })
    );

    expect(screen.getByRole("heading", { name: /accès requis/i })).toBeInTheDocument();

    axios.post.mockResolvedValueOnce({ data: { id: 42 } });

    rerender(
        <AuthContext.Provider value={authValue()}>
            <BrowserRouter>
                <SubmitFact />
            </BrowserRouter>
        </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/saisissez le texte/i), {
        target: { value: "Une affirmation à vérifier" },
    });
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/exemple.com\/article/i), {
        target: { value: "https://source.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lancer la vérification/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
});

test("image tools validate missing files before uploading", async () => {
    const { container, unmount } = renderWithAuth(<AIImageDetection />);
    fireEvent.submit(container.querySelector("form"));
    expect(await screen.findByText(/veuillez sélectionner une image/i)).toBeInTheDocument();
    unmount();

    const imageVerification = renderWithAuth(<ImageContentVerification />);
    fireEvent.change(screen.getByPlaceholderText(/cette image montre le président français/i), {
        target: { value: "Cette image montre une inondation" },
    });
    fireEvent.submit(imageVerification.container.querySelector("form"));
    expect(await screen.findByText(/veuillez sélectionner une image/i)).toBeInTheDocument();
    expect(window.fetch).not.toHaveBeenCalled();
});

test("ai image detection starts an authenticated upload task", async () => {
    renderWithAuth(<AIImageDetection />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(["image"], "sample.png", { type: "image/png" });
    await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
    });
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());
    expect(await screen.findByText(/détection en cours/i)).toBeInTheDocument();
});
