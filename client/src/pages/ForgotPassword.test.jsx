import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPassword from "./ForgotPassword";
import { renderAuth } from "./authTestUtils";

test("calls sendPasswordReset and shows the same confirmation", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<ForgotPassword />, {
        path: "/mot-de-passe-oublie",
        auth: { sendPasswordReset: vi.fn().mockResolvedValue({ ok: true }) },
    });
    const email = screen.getByLabelText("Adresse e-mail");
    expect(email).toHaveAttribute("autocomplete", "email");
    await user.type(email, "a@b.fr");
    await user.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    expect(auth.sendPasswordReset).toHaveBeenCalledWith("a@b.fr");
    expect(await screen.findByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeInTheDocument();
    expect(screen.getByText(/si un compte existe/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour à la connexion/i })).toHaveAttribute("href", "/connexion");
});

test("validates the e-mail on submit", async () => {
    const user = userEvent.setup();
    const auth = renderAuth(<ForgotPassword />, { path: "/mot-de-passe-oublie" });
    await user.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    expect(screen.getByText(/adresse e-mail valide/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse e-mail")).toHaveFocus();
    expect(auth.sendPasswordReset).not.toHaveBeenCalled();
});

test("shows a French error when the request itself fails", async () => {
    const user = userEvent.setup();
    renderAuth(<ForgotPassword />, {
        path: "/mot-de-passe-oublie",
        auth: { sendPasswordReset: vi.fn().mockResolvedValue({ ok: false, message: "Trop de tentatives." }) },
    });
    await user.type(screen.getByLabelText("Adresse e-mail"), "a@b.fr");
    await user.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de tentatives.");
});
