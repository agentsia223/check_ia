import { toFrenchAuthError, GENERIC_AUTH_ERROR } from "./authErrors";

describe("toFrenchAuthError", () => {
    test.each([
        ["invalid credentials by code", { code: "invalid_credentials", message: "Invalid login credentials" }, /e-mail ou mot de passe incorrect/i],
        ["invalid credentials by message", { message: "Invalid login credentials", status: 400 }, /e-mail ou mot de passe incorrect/i],
        ["email not confirmed", { code: "email_not_confirmed", message: "Email not confirmed" }, /confirmez votre adresse/i],
        ["email not confirmed by message", { message: "Email not confirmed" }, /confirmez votre adresse/i],
        ["user already registered", { code: "user_already_exists", message: "User already registered" }, /compte existe déjà/i],
        ["user already registered by message", { message: "User already registered" }, /compte existe déjà/i],
        ["email exists", { code: "email_exists" }, /compte existe déjà/i],
        ["weak password", { code: "weak_password", message: "Password should be at least 6 characters." }, /mot de passe est trop faible/i],
        ["weak password by message", { message: "Password should be at least 6 characters." }, /mot de passe est trop faible/i],
        ["rate limit by status", { status: 429, message: "Too many requests" }, /trop de tentatives/i],
        ["rate limit by code", { code: "over_email_send_rate_limit" }, /trop de tentatives/i],
        ["rate limit by message", { message: "For security purposes, you can only request this after 42 seconds." }, /trop de tentatives/i],
        ["same password", { code: "same_password" }, /différent de l'ancien/i],
        ["expired link", { message: "Auth session missing!" }, /lien a expiré/i],
        ["invalid email", { code: "email_address_invalid" }, /adresse e-mail n'est pas valide/i],
        ["network", { message: "Failed to fetch" }, /connexion/i],
    ])("%s", (_name, error, pattern) => {
        expect(toFrenchAuthError(error)).toMatch(pattern);
    });

    test("unknown errors give the generic French message, never the raw text", () => {
        const message = toFrenchAuthError({ message: "Database error saving new user" });
        expect(message).toBe(GENERIC_AUTH_ERROR);
        expect(message).not.toMatch(/database/i);
    });

    test("handles missing input", () => {
        expect(toFrenchAuthError(undefined)).toBe(GENERIC_AUTH_ERROR);
        expect(toFrenchAuthError("boom")).toBe(GENERIC_AUTH_ERROR);
    });
});
