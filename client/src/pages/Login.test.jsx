import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login";
import { renderAuth } from "./authTestUtils";
import { returnTarget } from "./authShared";

test("fields have labels and autocomplete", () => {
    renderAuth(<Login />, { path: "/connexion" });
    const email = screen.getByLabelText("Adresse e-mail");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("link", { name: /mot de passe oublié/i })).toHaveAttribute("href", "/mot-de-passe-oublie");
    expect(screen.getByRole("link", { name: /conditions d'utilisation/ })).toHaveAttribute("href", "/conditions");
    expect(screen.getByRole("link", { name: /politique de confidentialité/ })).toHaveAttribute("href", "/confidentialite");
});

test("show-password button toggles and changes name", async () => {
    const user = userEvent.setup();
    renderAuth(<Login />, { path: "/connexion" });
    const pw = screen.getByLabelText("Mot de passe");
    expect(pw).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(pw).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toBeInTheDocument();
});

test("validates on submit and focuses first invalid field", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<Login />, { path: "/connexion" });
    await user.type(screen.getByLabelText("Adresse e-mail"), "abc");
    expect(screen.queryByText(/adresse e-mail valide/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(screen.getByText(/adresse e-mail valide/i)).toBeInTheDocument();
    expect(screen.getByText("Saisissez votre mot de passe.")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse e-mail")).toHaveFocus();
    expect(auth.signIn).not.toHaveBeenCalled();
});

test("success navigates to from.pathname with replace and shows note", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<Login />, {
        path: "/connexion",
        state: { from: { pathname: "/mes-verifications" } },
        auth: { signIn: vi.fn().mockResolvedValue({ ok: true }) },
    });
    expect(screen.getByText("Connectez-vous pour continuer.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(auth.signIn).toHaveBeenCalledWith("a@b.fr", "secret123");
    expect(await screen.findByTestId("where")).toHaveTextContent("/mes-verifications");
});

test("success returns to the full from location: path, query and hash", async () => {
    const user = userEvent.setup();
    renderAuth(<Login />, {
        path: "/connexion",
        state: { from: { pathname: "/bibliotheque", search: "?q=riz&verdict=faux", hash: "#resultats" } },
        auth: { signIn: vi.fn().mockResolvedValue({ ok: true }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByTestId("where")).toHaveTextContent(/^\/bibliotheque\?q=riz&verdict=faux#resultats$/);
});

test("the return target never comes from the URL", async () => {
    const user = userEvent.setup();
    renderAuth(<Login />, {
        path: "/connexion",
        search: "?from=%2Fmes-verifications&next=https%3A%2F%2Fevil.example",
        auth: { signIn: vi.fn().mockResolvedValue({ ok: true }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "x");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByTestId("where")).toHaveTextContent(/^\/$/);
});

test("already signed in: redirects to the full from location", async () => {
    renderAuth(<Login />, {
        path: "/connexion",
        state: { from: { pathname: "/v/abc", search: "?lang=bm", hash: "#partage" } },
        auth: { isLoggedIn: true, user: { id: "1" } },
    });
    expect(await screen.findByTestId("where")).toHaveTextContent(/^\/v\/abc\?lang=bm#partage$/);
});

test("success without state goes to / ; no note", async () => {
    const user = userEvent.setup();
    renderAuth(<Login />, { path: "/connexion", auth: { signIn: vi.fn().mockResolvedValue({ ok: true }) } });
    expect(screen.queryByText("Connectez-vous pour continuer.")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "x");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/");
});

test("shows the French error from signIn and re-enables the button", async () => {
    const user = userEvent.setup();
    renderAuth(<Login />, {
        path: "/connexion",
        auth: { signIn: vi.fn().mockResolvedValue({ ok: false, message: "E-mail ou mot de passe incorrect." }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "x");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou mot de passe incorrect.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled());
});

test("button is disabled and busy while the request runs", async () => {
    const user = userEvent.setup();
    let resolve;
    renderAuth(<Login />, {
        path: "/connexion",
        auth: { signIn: vi.fn(() => new Promise((r) => (resolve = r))) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "x");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    const btn = screen.getByRole("button", { name: "Se connecter" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    resolve({ ok: false, message: "Erreur." });
    await screen.findByRole("alert");
});

test("link to register keeps location.state", () => {
    renderAuth(<Login />, { path: "/connexion", state: { from: { pathname: "/x" } } });
    expect(screen.getByRole("link", { name: /créer un compte/i })).toHaveAttribute("href", "/inscription");
});

test("signed-in users are redirected to /", () => {
    renderAuth(<Login />, { path: "/connexion", auth: { isLoggedIn: true, user: { id: "1" } } });
    expect(screen.getByTestId("where")).toHaveTextContent("/");
});

test("returnTarget falls back to / for missing or odd router state", () => {
    expect(returnTarget({})).toBe("/");
    expect(returnTarget({ state: { from: { pathname: 42 } } })).toBe("/");
    expect(returnTarget({ state: { from: { pathname: "https://evil.example/" } } })).toBe("/");
    expect(returnTarget({ state: { from: { pathname: "//evil.example" } } })).toBe("/");
    expect(returnTarget({ state: { from: { pathname: "/x", search: 1, hash: null } } })).toBe("/x");
});
