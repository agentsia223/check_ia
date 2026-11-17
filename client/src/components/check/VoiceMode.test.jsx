import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import Composer from "./Composer";
import { AuthContext } from "../../auth/AuthContext";
import { createTextCheck } from "../../lib/checks";
import { apiFetch } from "../../lib/api";
import { useVoiceDictation } from "../../hooks/useVoiceDictation";

vi.mock("../../lib/checks", () => ({
    createTextCheck: vi.fn(),
    createImageCheck: vi.fn(),
}));

vi.mock("../../lib/api", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiFetch: vi.fn(() => Promise.resolve(null)) };
});

vi.mock("../../hooks/useVoiceDictation", () => ({ useVoiceDictation: vi.fn() }));

const voice = (overrides = {}) => ({
    phase: "idle",
    transcript: "",
    isTouch: false,
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    notice: null,
    clearNotice: vi.fn(),
    ...overrides,
});

const authValue = (overrides = {}) => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    getAccessToken: () => null,
    ...overrides,
});
const signedIn = () => authValue({ user: { id: "u1" }, isLoggedIn: true, getAccessToken: () => "jeton" });

function CheckStub() {
    const { id } = useParams();
    return <p>Page de la vérification {id}</p>;
}

function AuthStub({ name }) {
    const location = useLocation();
    return (
        <p>
            {name}, retour vers {location.state?.from?.pathname}
        </p>
    );
}

const renderComposer = (auth) =>
    render(
        <AuthContext.Provider value={auth}>
            <MemoryRouter>
                <Routes>
                    <Route path="/" element={<Composer />} />
                    <Route path="/v/:id" element={<CheckStub />} />
                    <Route path="/connexion" element={<AuthStub name="Connexion" />} />
                    <Route path="/inscription" element={<AuthStub name="Inscription" />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

// The voice panel is lazy-loaded: wait for its loading line to go.
const openVoice = async (user) => {
    await user.click(screen.getByRole("tab", { name: "Voix bambara" }));
    await waitFor(() => expect(document.querySelector(".voiceLoading")).toBeNull());
};
const lastHookOptions = () => useVoiceDictation.mock.calls.at(-1)[0];

beforeEach(() => {
    useVoiceDictation.mockImplementation(() => voice());
    apiFetch.mockImplementation(() => Promise.resolve(null));
});

afterEach(() => {
    vi.clearAllMocks();
});

test("signed out: shows a sign-in invitation instead of the recorder, and does not warm the service", async () => {
    const user = userEvent.setup();
    renderComposer(authValue());
    await openVoice(user);

    expect(screen.getByText(/la dictée en bambara demande un compte/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enregistrer en bambara/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();

    await user.click(screen.getByRole("link", { name: "Se connecter" }));
    expect(screen.getByText("Connexion, retour vers /")).toBeInTheDocument();
});

test("while the session loads, neither the invitation nor the recorder shows", async () => {
    const user = userEvent.setup();
    renderComposer(authValue({ loading: true }));
    await openVoice(user);
    expect(screen.queryByText(/demande un compte/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enregistrer en bambara/i })).not.toBeInTheDocument();
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
});

test("signed in: warms the voice service when the mode opens", async () => {
    const user = userEvent.setup();
    renderComposer(signedIn());
    expect(apiFetch).not.toHaveBeenCalled();
    await openVoice(user);
    expect(apiFetch).toHaveBeenCalledWith("bambara/warm/", { method: "POST" });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(lastHookOptions()).toMatchObject({ isLoggedIn: true, language: "bm", enabled: true });
});

test("a failed warm-up is ignored", async () => {
    const user = userEvent.setup();
    apiFetch.mockImplementation(() => Promise.reject(new Error("réveil impossible")));
    renderComposer(signedIn());
    await openVoice(user);
    await act(async () => {});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer en bambara" })).toBeInTheDocument();
});

test("the mic button toggles recording on pointer devices", async () => {
    const user = userEvent.setup();
    const state = voice();
    useVoiceDictation.mockImplementation(() => state);
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getByText(/appuyez sur le micro ou utilisez la touche espace/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enregistrer en bambara" }));
    expect(state.toggle).toHaveBeenCalledTimes(1);
});

test("touch devices press and hold", async () => {
    const user = userEvent.setup();
    const state = voice({ isTouch: true });
    useVoiceDictation.mockImplementation(() => state);
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getByText(/maintenez le micro pour parler/i)).toBeInTheDocument();
    const mic = screen.getByRole("button", { name: "Enregistrer en bambara" });
    await user.pointer({ keys: "[MouseLeft>]", target: mic });
    expect(state.start).toHaveBeenCalled();
    await user.pointer({ keys: "[/MouseLeft]", target: mic });
    expect(state.stop).toHaveBeenCalled();
    expect(state.toggle).not.toHaveBeenCalled();
});

test("shows the recording phase", async () => {
    const user = userEvent.setup();
    useVoiceDictation.mockImplementation(() => voice({ phase: "recording" }));
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getByRole("button", { name: "Arrêter l'enregistrement" })).toBeInTheDocument();
    expect(screen.getByText("Écoute en cours…")).toBeInTheDocument();
});

test("shows the transcribing phase with the mic disabled", async () => {
    const user = userEvent.setup();
    useVoiceDictation.mockImplementation(() => voice({ phase: "transcribing" }));
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getAllByText(/transcription en cours/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Enregistrer en bambara" })).toBeDisabled();
});

test("dictated text lands in the field for review and is not submitted", async () => {
    const user = userEvent.setup();
    createTextCheck.mockResolvedValue({ id: "voix01" });
    renderComposer(signedIn());
    await openVoice(user);

    act(() => lastHookOptions().onText("Le pont de Koulikoro est fermé"));

    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier (en français)" });
    expect(box).toHaveValue("Le pont de Koulikoro est fermé");
    expect(screen.getByText(/traduit du bambara/i)).toBeInTheDocument();
    expect(createTextCheck).not.toHaveBeenCalled();

    await user.type(box, " depuis lundi");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(createTextCheck).toHaveBeenCalledWith("Le pont de Koulikoro est fermé depuis lundi");
    expect(await screen.findByText("Page de la vérification voix01")).toBeInTheDocument();
});

test("dictated text is also in the Texte mode", async () => {
    const user = userEvent.setup();
    renderComposer(signedIn());
    await openVoice(user);
    act(() => lastHookOptions().onText("Texte dicté"));
    await user.click(screen.getByRole("tab", { name: "Texte" }));
    expect(screen.getByRole("textbox", { name: "Affirmation à vérifier" })).toHaveValue("Texte dicté");
});

test("renders the hook's notice", async () => {
    const user = userEvent.setup();
    useVoiceDictation.mockImplementation(() =>
        voice({ notice: { tone: "error", message: "Impossible d'accéder au microphone." } })
    );
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible d'accéder au microphone.");
});

test("shows the Bambara transcript once there is one", async () => {
    const user = userEvent.setup();
    useVoiceDictation.mockImplementation(() => voice({ transcript: "I ni ce" }));
    renderComposer(signedIn());
    await openVoice(user);
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
});
