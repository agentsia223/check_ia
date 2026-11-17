import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPassword from "./ResetPassword";
import { renderAuth } from "./authTestUtils";

const signedIn = { isLoggedIn: true, user: { id: "1" } };

test("without a recovery session shows the invalid-link screen", () => {
    renderAuth(<ResetPassword />, { path: "/reinitialiser" });
    expect(screen.getByText("Ce lien n'est plus valide")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /demander un nouveau lien/i })).toHaveAttribute("href", "/mot-de-passe-oublie");
});

test("while loading it does not judge the link", () => {
    renderAuth(<ResetPassword />, { path: "/reinitialiser", auth: { loading: true } });
    expect(screen.queryByText("Ce lien n'est plus valide")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nouveau mot de passe")).not.toBeInTheDocument();
});

test("updates the password then goes to /", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<ResetPassword />, {
        path: "/reinitialiser",
        auth: { ...signedIn, updatePassword: vi.fn().mockResolvedValue({ ok: true }) },
    });
    const pw = screen.getByLabelText("Nouveau mot de passe");
    expect(pw).toHaveAttribute("autocomplete", "new-password");
    await user.type(pw, "secret123");
    await user.click(screen.getByRole("button", { name: "Enregistrer le mot de passe" }));
    expect(auth.updatePassword).toHaveBeenCalledWith("secret123");
    expect(await screen.findByTestId("where")).toHaveTextContent("/");
});

test("rejects a short password on submit", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<ResetPassword />, { path: "/reinitialiser", auth: signedIn });
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "abc");
    await user.click(screen.getByRole("button", { name: "Enregistrer le mot de passe" }));
    expect(screen.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveFocus();
    expect(auth.updatePassword).not.toHaveBeenCalled();
});

test("shows the French error and has an accessible show-password button", async () => {
    const user = userEvent.setup();
    renderAuth(<ResetPassword />, {
        path: "/reinitialiser",
        auth: { ...signedIn, updatePassword: vi.fn().mockResolvedValue({ ok: false, message: "Le lien a expiré." }) },
    });
    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveAttribute("type", "text");
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "secret123");
    await user.click(screen.getByRole("button", { name: "Enregistrer le mot de passe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le lien a expiré.");
});
