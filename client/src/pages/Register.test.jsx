import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "./Register";
import { renderAuth } from "./authTestUtils";

test("asks for email and password only, with new-password autocomplete", () => {
    renderAuth(<Register />, { path: "/inscription" });
    expect(screen.getByLabelText("Adresse e-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conditions d'utilisation/ })).toHaveAttribute("href", "/conditions");
    expect(screen.getByRole("link", { name: /politique de confidentialité/ })).toHaveAttribute("href", "/confidentialite");
    expect(screen.getByRole("link", { name: /se connecter/i })).toHaveAttribute("href", "/connexion");
});

test("rejects passwords under 8 characters on submit", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<Register />, { path: "/inscription" });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "short");
    expect(screen.queryByText(/au moins 8 caractères/i)).toBeInTheDocument(); // hint is always visible
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(screen.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toHaveFocus();
    expect(auth.signUp).not.toHaveBeenCalled();
});

test("without a session shows the check-your-inbox screen naming the address, no redirect", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<Register />, {
        path: "/inscription",
        auth: { signUp: vi.fn().mockResolvedValue({ ok: true, hasSession: false }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(auth.signUp).toHaveBeenCalledWith("a@b.fr", "secret123");
    expect(await screen.findByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeInTheDocument();
    expect(screen.getByText("a@b.fr")).toBeInTheDocument();
    expect(screen.queryByTestId("where")).not.toBeInTheDocument();
});

test("shows the French error from signUp", async () => {
    const user = userEvent.setup();
    renderAuth(<Register />, {
        path: "/inscription",
        auth: { signUp: vi.fn().mockResolvedValue({ ok: false, message: "Un compte existe déjà avec cette adresse." }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Un compte existe déjà");
});

test("signed-in users are redirected to /", () => {
    renderAuth(<Register />, { path: "/inscription", auth: { isLoggedIn: true, user: { id: "1" } } });
    expect(screen.getByTestId("where")).toHaveTextContent("/");
});

test("login link keeps state", () => {
    renderAuth(<Register />, { path: "/inscription", state: { from: { pathname: "/x" } } });
    expect(screen.getByRole("link", { name: /se connecter/i })).toHaveAttribute("href", "/connexion");
});

test("with a session after sign-up, leaves the form for where the visitor came from", async () => {
    const user = userEvent.setup();
    renderAuth(<Register />, {
        path: "/inscription",
        state: { from: { pathname: "/v/abc" } },
        auth: { signUp: vi.fn().mockResolvedValue({ ok: true, hasSession: true }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/v/abc");
    expect(screen.queryByRole("heading", { name: "Vérifiez votre boîte mail" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Adresse e-mail")).not.toBeInTheDocument();
});
