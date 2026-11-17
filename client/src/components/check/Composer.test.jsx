import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import Composer from "./Composer";
import { AuthContext } from "../../auth/AuthContext";
import { createTextCheck } from "../../lib/checks";
import { ApiError } from "../../lib/api";

vi.mock("../../lib/checks", () => ({
    createTextCheck: vi.fn(),
    createImageCheck: vi.fn(),
}));

vi.mock("../../lib/api", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiFetch: vi.fn(() => Promise.resolve(null)) };
});

const authValue = (overrides = {}) => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    getAccessToken: () => null,
    ...overrides,
});

function CheckStub() {
    const { id } = useParams();
    return <p>Page de la vérification {id}</p>;
}

function AuthStub({ name }) {
    const location = useLocation();
    return (
        <p>
            {name}, retour vers {location.state?.from?.pathname ?? "aucun"}
        </p>
    );
}

const renderComposer = (auth = authValue(), path = "/") =>
    render(
        <AuthContext.Provider value={auth}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/" element={<Composer />} />
                    <Route path="/v/:id" element={<CheckStub />} />
                    <Route path="/inscription" element={<AuthStub name="Inscription" />} />
                    <Route path="/connexion" element={<AuthStub name="Connexion" />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

const claimBox = () => screen.getByRole("textbox", { name: "Affirmation à vérifier" });
const submitButton = () => screen.getByRole("button", { name: "Vérifier" });

afterEach(() => {
    vi.clearAllMocks();
});

test("shows the three modes as tabs, text first", () => {
    renderComposer();
    expect(screen.getByRole("tablist", { name: /type de vérification/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Texte" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Voix bambara" })).toBeInTheDocument();
});

test("submit is disabled while the text is empty or blank", async () => {
    const user = userEvent.setup();
    renderComposer();
    expect(submitButton()).toBeDisabled();
    await user.type(claimBox(), "   ");
    expect(submitButton()).toBeDisabled();
    await user.type(claimBox(), "Le pont est fermé");
    expect(submitButton()).toBeEnabled();
});

test("over 1 000 characters the submit is disabled", () => {
    renderComposer();
    fireEvent.change(claimBox(), { target: { value: "a".repeat(1001) } });
    expect(submitButton()).toBeDisabled();
});

test("submitting navigates to the check page as soon as the create call returns", async () => {
    const user = userEvent.setup();
    createTextCheck.mockResolvedValue({ id: "abc123", state: "running" });
    renderComposer();

    await user.type(claimBox(), "  Le pont de Koulikoro est fermé  ");
    await user.click(submitButton());

    expect(createTextCheck).toHaveBeenCalledWith("Le pont de Koulikoro est fermé");
    expect(await screen.findByText("Page de la vérification abc123")).toBeInTheDocument();
});

test.each([
    ["Ctrl", "{Control>}{Enter}{/Control}"],
    ["Cmd", "{Meta>}{Enter}{/Meta}"],
])("%s+Enter submits from the text field", async (_name, keys) => {
    const user = userEvent.setup();
    createTextCheck.mockResolvedValue({ id: "kbd001" });
    renderComposer();

    await user.type(claimBox(), "Électricité gratuite");
    await user.keyboard(keys);

    expect(createTextCheck).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Page de la vérification kbd001")).toBeInTheDocument();
});

test("plain Enter adds a line and does not submit", async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.type(claimBox(), "Ligne 1{Enter}Ligne 2");
    expect(createTextCheck).not.toHaveBeenCalled();
    expect(claimBox()).toHaveValue("Ligne 1\nLigne 2");
});

test("Ctrl+Enter does nothing while the text is empty", async () => {
    const user = userEvent.setup();
    renderComposer();
    claimBox().focus();
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(createTextCheck).not.toHaveBeenCalled();
});

test("anon_quota keeps the text and invites to create an account or sign in", async () => {
    const user = userEvent.setup();
    const message = "Vous avez utilisé votre vérification gratuite. Créez un compte pour continuer.";
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota", message, { code: "anon_quota", error: message }));
    renderComposer();

    await user.type(claimBox(), "Le prix du pain baisse");
    await user.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(claimBox()).toHaveValue("Le prix du pain baisse");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");

    await user.click(screen.getByRole("link", { name: "Créer un compte" }));
    expect(screen.getByText("Inscription, retour vers /")).toBeInTheDocument();
});

test("the sign-in link from the quota notice also passes state.from", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota"));
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());
    await user.click(await screen.findByRole("link", { name: "Se connecter" }));
    expect(screen.getByText("Connexion, retour vers /")).toBeInTheDocument();
});

test("ip_cap shows its own message", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new ApiError(429, "ip_cap", "", { code: "ip_cap" }));
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());

    expect(
        await screen.findByText(/trop de vérifications depuis cette connexion aujourd'hui\. réessayez demain/i)
    ).toBeInTheDocument();
    expect(claimBox()).toHaveValue("Texte");
});

test("a network failure says what happened and offers a retry", async () => {
    const user = userEvent.setup();
    createTextCheck
        .mockRejectedValueOnce(new ApiError(0, "network"))
        .mockResolvedValueOnce({ id: "retry01" });
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/connexion impossible/i);
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(createTextCheck).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Page de la vérification retry01")).toBeInTheDocument();
});

test("other errors use the French message from errorMessageFr", async () => {
    const user = userEvent.setup();
    const serverMessage = "Le texte ne doit pas dépasser 1000 caractères.";
    createTextCheck.mockRejectedValue(new ApiError(400, "invalid", serverMessage, { error: serverMessage }));
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(serverMessage);
});

test("an unexpected exception never shows raw text", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new TypeError("undefined is not a function"));
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Un problème est survenu. Réessayez dans un instant.");
    expect(alert).not.toHaveTextContent(/undefined/);
});

test("the button shows progress and does not submit twice", async () => {
    const user = userEvent.setup();
    let resolve;
    createTextCheck.mockReturnValue(new Promise((r) => (resolve = r)));
    renderComposer();
    await user.type(claimBox(), "Texte");
    await user.click(submitButton());

    expect(submitButton()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(createTextCheck).toHaveBeenCalledTimes(1);
    resolve({ id: "once01" });
    expect(await screen.findByText("Page de la vérification once01")).toBeInTheDocument();
});

test("the text example chip fills the field", async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole("button", { name: /le prix du carburant va doubler la semaine prochaine/i }));
    expect(claimBox()).toHaveValue("Le prix du carburant va doubler la semaine prochaine");
    expect(claimBox()).toHaveFocus();
    expect(createTextCheck).not.toHaveBeenCalled();
});

test("the photo example chip switches to the Image mode", async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole("button", { name: "Une photo reçue sur WhatsApp" }));
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Choisir l'image à vérifier")).toBeInTheDocument();
});

test("the text is kept when switching modes", async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.type(claimBox(), "Gardé");
    await user.click(screen.getByRole("tab", { name: "Image" }));
    await user.click(screen.getByRole("tab", { name: "Texte" }));
    expect(claimBox()).toHaveValue("Gardé");
});

test("?mode=image opens the Image mode (old /verify-image links)", () => {
    renderComposer(authValue(), "/?mode=image");
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
});

test("does not show link wording: links are not supported", () => {
    renderComposer();
    expect(screen.queryByText(/lien d'article/i)).not.toBeInTheDocument();
    expect(claimBox().getAttribute("placeholder")).not.toMatch(/lien/i);
});

test("shows the keyboard shortcut hint", () => {
    renderComposer();
    expect(screen.getByText("Entrée")).toBeInTheDocument();
});

test("arrow keys, Home and End move between the mode tabs and select them", async () => {
    const user = userEvent.setup();
    renderComposer();
    const text = screen.getByRole("tab", { name: "Texte" });
    expect(text).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", text.id);
    text.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Image" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Voix bambara" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Texte" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}{Home}");
    expect(screen.getByRole("tab", { name: "Texte" })).toHaveFocus();
});

test("a paste into a field outside the composer is left alone", () => {
    renderComposer();
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    const file = new File(["x"], "capture.png", { type: "image/png" });
    fireEvent.paste(outside, { clipboardData: { files: [file], getData: () => "" } });
    expect(screen.getByRole("tab", { name: "Texte" })).toHaveAttribute("aria-selected", "true");
    outside.remove();
});

test("editing the text clears an error notice", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new ApiError(0, "network"));
    renderComposer();
    await user.type(claimBox(), "Une affirmation");
    await user.click(submitButton());
    expect(await screen.findByText(/Connexion impossible/)).toBeInTheDocument();
    await user.type(claimBox(), " de plus");
    expect(screen.queryByText(/Connexion impossible/)).not.toBeInTheDocument();
});

test("the sign-up prompt stays while editing and goes when the mode changes", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota"));
    renderComposer();
    await user.type(claimBox(), "Une affirmation");
    await user.click(submitButton());
    expect(await screen.findByText(/vérification gratuite/)).toBeInTheDocument();
    await user.type(claimBox(), " de plus");
    expect(screen.getByText(/vérification gratuite/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Image" }));
    expect(screen.queryByText(/vérification gratuite/)).not.toBeInTheDocument();
});

test("the sign-up prompt goes once the visitor is signed in", async () => {
    const user = userEvent.setup();
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota"));
    const { rerender } = renderComposer();
    await user.type(claimBox(), "Une affirmation");
    await user.click(submitButton());
    expect(await screen.findByText(/vérification gratuite/)).toBeInTheDocument();
    rerender(
        <AuthContext.Provider value={authValue({ user: { id: "u" }, isLoggedIn: true })}>
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<Composer />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );
    expect(screen.queryByText(/vérification gratuite/)).not.toBeInTheDocument();
});
