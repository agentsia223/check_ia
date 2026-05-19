import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { toast } from "react-toastify";
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
    jest.useRealTimers();
    delete global.fetch;
    delete window.fetch;
});

const mockFetchResponses = (...responses) => {
    const fetchMock = jest.fn((...args) => {
        const next = responses.shift();
        if (next instanceof Error) {
            return Promise.reject(next);
        }
        return Promise.resolve({
            ok: next?.ok ?? true,
            json: () => Promise.resolve(next?.body ?? next),
        });
    });
    global.fetch = fetchMock;
    window.fetch = fetchMock;
    return fetchMock;
};

const selectImage = async (container, overrides = {}) => {
    const file = new File(["image"], overrides.name || "sample.png", {
        type: overrides.type || "image/png",
    });
    if (overrides.size) {
        Object.defineProperty(file, "size", { value: overrides.size });
    }

    await act(async () => {
        fireEvent.change(container.querySelector('input[type="file"]'), {
            target: { files: [file] },
        });
    });

    return file;
};

const advancePolling = async (expectedFetchCalls) => {
    await act(async () => {
        jest.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(expectedFetchCalls));
};

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

test("submit fact polls completed submissions and renders verified sources", async () => {
    const intervalSpy = jest.spyOn(window, "setInterval").mockImplementation((callback) => {
        callback();
        return 1;
    });
    axios.post.mockResolvedValueOnce({ data: { id: 42 } });
    axios.get.mockResolvedValueOnce({
        data: {
            statut: "vérifié",
            web_sources: [
                {
                    title: "Official source",
                    link: "https://source.test",
                    date: "2026-05-19",
                },
            ],
            detailed_result: "Detailed verification result",
        },
    });

    renderWithAuth(<SubmitFact />);

    fireEvent.change(screen.getByLabelText(/saisissez le texte/i), {
        target: { value: "Une affirmation à vérifier" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lancer la vérification/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(await screen.findByText("Information Vérifiée")).toBeInTheDocument();
    expect(screen.getByText("Detailed verification result")).toBeInTheDocument();
    expect(screen.getByText("Official source")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(
        "http://localhost:8000/api/submissions/42/",
        { headers: { Authorization: "Bearer test-token" } }
    );
    intervalSpy.mockRestore();
});

test("submit fact clears previous results when the claim changes and handles polling errors", async () => {
    const intervalSpy = jest.spyOn(window, "setInterval").mockImplementation((callback) => {
        callback();
        return 1;
    });
    axios.post.mockResolvedValueOnce({ data: { id: 51 } });
    axios.get.mockRejectedValueOnce(new Error("poll failed"));

    renderWithAuth(<SubmitFact />);

    fireEvent.change(screen.getByLabelText(/saisissez le texte/i), {
        target: { value: "Une affirmation douteuse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lancer la vérification/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/saisissez le texte/i), {
        target: { value: "Une autre affirmation" },
    });
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith(
        "Une erreur est survenue lors de la vérification du statut."
    );
    intervalSpy.mockRestore();
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

test("image tools reject invalid and oversized selected files", async () => {
    const ai = renderWithAuth(<AIImageDetection />);

    await selectImage(ai.container, { type: "text/plain", name: "note.txt" });
    expect(await screen.findByText(/veuillez sélectionner un fichier image valide/i)).toBeInTheDocument();
    ai.unmount();

    const imageVerification = renderWithAuth(<ImageContentVerification />);
    await selectImage(imageVerification.container, {
        size: 11 * 1024 * 1024,
    });
    expect(await screen.findByText(/ne doit pas dépasser 10mb/i)).toBeInTheDocument();
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

test.each([
    ["IA_DÉTECTÉE", /ia détectée/i, /caractéristiques typiques/i],
    ["AUTHENTIQUE", /image authentique/i, /appareil photo réel/i],
    ["INCERTAIN", /résultat incertain/i, /pas possible de déterminer/i],
])("ai image detection renders completed %s polling results", async (status, label, description) => {
    jest.useFakeTimers();
    mockFetchResponses(
        { body: { task_id: "upload-task" } },
        { body: { state: "SUCCESS", result: { success: true, task_id: "analysis-task" } } },
        {
            body: {
                state: "SUCCESS",
                result: {
                    success: true,
                    status,
                    confidence: 76,
                    explanation: "**Analyse**\n- détail suspect\nligne simple",
                    details: { type_verification: "Détection IA" },
                    date: "2026-05-19T12:00:00Z",
                },
            },
        }
    );

    const { container } = renderWithAuth(<AIImageDetection />);
    await selectImage(container);
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await advancePolling(2);
    await advancePolling(3);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByText(/détail suspect/i)).toBeInTheDocument();
    expect(screen.getByText(/type:/i)).toBeInTheDocument();
});

test("ai image detection handles upload failures, missing task ids, expired sessions, and polling failures", async () => {
    const { container, unmount } = renderWithAuth(<AIImageDetection />);
    mockFetchResponses({ ok: false, body: { error: "Upload refused" } });
    await selectImage(container);
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));
    expect(await screen.findByText("Upload refused")).toBeInTheDocument();
    unmount();

    const missingTask = renderWithAuth(<AIImageDetection />);
    mockFetchResponses({ body: {} });
    await selectImage(missingTask.container);
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));
    expect(await screen.findByText(/task id not received/i)).toBeInTheDocument();
    missingTask.unmount();

    jest.useFakeTimers();
    const expired = renderWithAuth(<AIImageDetection />);
    mockFetchResponses({ body: { task_id: "task-1" } });
    await selectImage(expired.container);
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    await act(async () => {
        jest.advanceTimersByTime(2000);
    });
    expect(await screen.findByText(/session expirée/i)).toBeInTheDocument();
    expired.unmount();

    const pollingFailure = renderWithAuth(<AIImageDetection />);
    mockFetchResponses(
        { body: { task_id: "task-1" } },
        { body: { state: "FAILURE", result: { error: "Detection failed" } } }
    );
    await selectImage(pollingFailure.container);
    fireEvent.click(screen.getByRole("button", { name: /détecter l'ia/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await advancePolling(2);
    expect(await screen.findByText("Detection failed")).toBeInTheDocument();
});

test.each([
    ["VRAIE", /affirmation confirmée/i],
    ["FAUSSE", /affirmation contredite/i],
    ["INDÉTERMINÉE", /résultat indéterminé/i],
    ["ANALYSÉE", /image analysée/i],
])("image content verification renders completed %s polling results", async (status, label) => {
    jest.useFakeTimers();
    mockFetchResponses(
        { body: { task_id: "upload-task" } },
        { body: { state: "SUCCESS", result: { success: true, task_id: "verification-task" } } },
        {
            body: {
                state: "SUCCESS",
                result: {
                    success: true,
                    status,
                    confidence: 83,
                    explanation: "**Conclusion**\n- élément visible\nligne finale",
                    details: { type_verification: "Contenu d'image" },
                    date: "2026-05-19T12:00:00Z",
                },
            },
        }
    );

    const { container } = renderWithAuth(<ImageContentVerification />);
    await selectImage(container);
    fireEvent.change(screen.getByPlaceholderText(/cette image montre le président français/i), {
        target: { value: "Cette image montre une inondation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /vérifier l'image/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await advancePolling(2);
    await advancePolling(3);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(/élément visible/i)).toBeInTheDocument();
    expect(screen.getByText(/affirmation vérifiée:/i)).toBeInTheDocument();
});

test("image content verification handles guests and async error states", async () => {
    const { unmount } = renderWithAuth(
        <ImageContentVerification />,
        authValue({ user: null, isLoggedIn: false })
    );
    expect(screen.getByText(/connexion requise/i)).toBeInTheDocument();
    unmount();

    const { container } = renderWithAuth(<ImageContentVerification />);
    mockFetchResponses({ ok: false, body: { error: "Verification refused" } });
    await selectImage(container);
    fireEvent.click(screen.getByRole("button", { name: /vérifier l'image/i }));
    expect(await screen.findByText("Verification refused")).toBeInTheDocument();
});

test("image content verification handles polling task errors and expired sessions", async () => {
    jest.useFakeTimers();
    const failedTask = renderWithAuth(<ImageContentVerification />);
    mockFetchResponses(
        { body: { task_id: "task-1" } },
        { body: { state: "SUCCESS", result: { success: false, error: "Verification task failed" } } }
    );
    await selectImage(failedTask.container);
    fireEvent.click(screen.getByRole("button", { name: /vérifier l'image/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await advancePolling(2);
    expect(await screen.findByText("Verification task failed")).toBeInTheDocument();
    failedTask.unmount();

    const expired = renderWithAuth(<ImageContentVerification />);
    mockFetchResponses({ body: { task_id: "task-1" } });
    await selectImage(expired.container);
    fireEvent.click(screen.getByRole("button", { name: /vérifier l'image/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    await act(async () => {
        jest.advanceTimersByTime(2000);
    });
    expect(await screen.findByText(/session expirée/i)).toBeInTheDocument();
});
