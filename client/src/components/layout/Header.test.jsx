import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Header from "./Header";
import { AuthContext } from "../../auth/AuthContext";

const authValue = (overrides = {}) => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(() => Promise.resolve({ ok: true })),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    getAccessToken: () => null,
    ...overrides,
});

const signedIn = (overrides = {}) =>
    authValue({ user: { id: "u1", email: "awa@example.org" }, isLoggedIn: true, ...overrides });

const renderHeader = (value = authValue(), path = "/bibliotheque") =>
    render(
        <AuthContext.Provider value={value}>
            <MemoryRouter initialEntries={[path]}>
                <Header />
                <Routes>
                    <Route path="/" element={<p>Accueil</p>} />
                    <Route path="*" element={<p>Autre page</p>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

test("shows the main links with real hrefs and marks the current page", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: /navigation principale/i });

    expect(within(nav).getByRole("link", { name: "Vérifier" })).toHaveAttribute("href", "/");
    const library = within(nav).getByRole("link", { name: "Bibliothèque" });
    expect(library).toHaveAttribute("href", "/bibliotheque");
    expect(library).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Fiabilité" })).toHaveAttribute("href", "/fiabilite");
    expect(screen.getByRole("link", { name: /check-ia, accueil/i })).toHaveAttribute("href", "/");
    expect(screen.getByText("Bêta")).toBeInTheDocument();
});

test("signed out: shows Mes vérifications and Connexion", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Mes vérifications" })).toHaveAttribute("href", "/mes-verifications");
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/connexion");
    expect(screen.queryByRole("button", { name: /compte/i })).not.toBeInTheDocument();
});

test("while the session loads, neither Connexion nor the account menu shows", () => {
    renderHeader(authValue({ loading: true }));
    expect(screen.queryByRole("link", { name: "Connexion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /compte/i })).not.toBeInTheDocument();
});

test("signed in: an account menu with the email and Se déconnecter", async () => {
    const value = signedIn();
    renderHeader(value);

    expect(screen.queryByRole("link", { name: "Connexion" })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /mon compte.*awa@example.org/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    expect(within(panel).getByText("awa@example.org")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(value.signOut).toHaveBeenCalled());
    expect(await screen.findByText("Accueil")).toBeInTheDocument();
});

test("the account button's accessible name contains its visible text", () => {
    renderHeader(signedIn());
    const button = screen.getByRole("button", { name: /mon compte/i });
    expect(button).not.toHaveAttribute("aria-label");
    expect(button).toHaveAccessibleName(/^Mon compte :\s?awa@example\.org$/);
    const visible = [...button.querySelectorAll("span:not(.sr-only)")].map((el) => el.textContent).join("");
    expect(visible).toBe("awa@example.org");
    expect(button.textContent).toContain(visible);
});

test("the account menu closes on Escape and on an outside click", () => {
    renderHeader(signedIn());
    const button = screen.getByRole("button", { name: /mon compte/i });

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();

    fireEvent.click(button);
    fireEvent.mouseDown(document.body);
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
});

test("the narrow-screen menu button has an accessible name and toggles the links", () => {
    renderHeader();
    const menuButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAccessibleName("Fermer le menu");
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(menuButton.getAttribute("aria-controls"));
    expect(within(panel).getByRole("link", { name: "Fiabilité" })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Connexion" })).toBeInTheDocument();

    // Navigating closes the menu.
    fireEvent.click(within(panel).getByRole("link", { name: "Vérifier" }));
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
});

test("the narrow-screen menu offers sign-out when signed in", async () => {
    const value = signedIn();
    renderHeader(value);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const panel = document.getElementById(
        screen.getByRole("button", { name: "Fermer le menu" }).getAttribute("aria-controls")
    );
    expect(within(panel).getByText("awa@example.org")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(value.signOut).toHaveBeenCalled());
});

test("has a skip link to the main content", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Aller au contenu" })).toHaveAttribute("href", "#contenu");
});
