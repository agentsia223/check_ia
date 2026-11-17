// Supabase auth errors → specific French messages. Raw provider text never reaches the UI.

export const GENERIC_AUTH_ERROR =
    "Un problème est survenu. Réessayez dans un instant.";

const RULES = [
    {
        codes: ["invalid_credentials", "invalid_grant"],
        pattern: /invalid login credentials/i,
        message: "E-mail ou mot de passe incorrect.",
    },
    {
        codes: ["email_not_confirmed"],
        pattern: /email not confirmed/i,
        message:
            "Confirmez votre adresse e-mail avant de vous connecter : ouvrez le lien reçu dans votre boîte de réception.",
    },
    {
        codes: ["user_already_exists", "email_exists"],
        pattern: /already registered|already exists/i,
        message: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou réinitialisez votre mot de passe.",
    },
    {
        codes: ["weak_password"],
        pattern: /password should be|password is too weak|weak password/i,
        message: "Ce mot de passe est trop faible. Choisissez-en un plus long, avec des lettres et des chiffres.",
    },
    {
        codes: [
            "over_request_rate_limit",
            "over_email_send_rate_limit",
            "over_sms_send_rate_limit",
        ],
        pattern: /rate limit|too many requests|for security purposes/i,
        message: "Trop de tentatives. Patientez une minute, puis réessayez.",
    },
    {
        codes: ["same_password"],
        pattern: /should be different from the old/i,
        message: "Choisissez un mot de passe différent de l'ancien.",
    },
    {
        codes: ["session_not_found", "session_expired", "otp_expired", "bad_jwt"],
        pattern: /auth session missing|session.*expired|token has expired|invalid.*token/i,
        message: "Le lien a expiré. Demandez un nouveau lien pour réinitialiser votre mot de passe.",
    },
    {
        codes: ["email_address_invalid", "email_address_not_authorized"],
        pattern: /unable to validate email|invalid email|email address .* is invalid/i,
        message: "Cette adresse e-mail n'est pas valide.",
    },
    {
        codes: [],
        pattern: /failed to fetch|network|load failed/i,
        message: "Connexion impossible. Vérifiez votre connexion internet, puis réessayez.",
    },
];

/**
 * @param {{code?: string, message?: string, status?: number} | unknown} error a Supabase AuthError (or anything).
 * @returns {string} a specific French message, or GENERIC_AUTH_ERROR.
 */
export function toFrenchAuthError(error) {
    if (!error || typeof error !== "object") return GENERIC_AUTH_ERROR;
    const code = typeof error.code === "string" ? error.code : "";
    const message = typeof error.message === "string" ? error.message : "";

    const byCode = code && RULES.find((rule) => rule.codes.includes(code));
    if (byCode) return byCode.message;
    if (error.status === 429) return RULES[4].message;
    const byMessage = message && RULES.find((rule) => rule.pattern.test(message));
    return byMessage ? byMessage.message : GENERIC_AUTH_ERROR;
}
