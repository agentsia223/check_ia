// Why creating a check failed, in the words shown to the user. Shared by the composer
// and the "Réessayer" / "Relancer" buttons on the check page so both say the same thing.
import { ApiError, errorMessageFr } from "./api";

export const FAILURE_MESSAGES = Object.freeze({
    anon_quota: "Vous avez utilisé votre vérification gratuite. Créez un compte pour continuer.",
    ip_cap: "Trop de vérifications depuis cette connexion aujourd'hui. Réessayez demain ou créez un compte.",
    network: "Connexion impossible. Vérifiez votre connexion internet, puis réessayez.",
});

/**
 * @param {unknown} error thrown by createTextCheck / createImageCheck
 * @returns {{code: "anon_quota"|"ip_cap"|"network"|"other", message: string}}
 */
export function describeCreateFailure(error) {
    if (error instanceof ApiError) {
        if (error.code === "anon_quota") return { code: "anon_quota", message: FAILURE_MESSAGES.anon_quota };
        if (error.code === "ip_cap") return { code: "ip_cap", message: FAILURE_MESSAGES.ip_cap };
        if (error.status === 0 || error.code === "network") return { code: "network", message: FAILURE_MESSAGES.network };
    }
    return { code: "other", message: errorMessageFr(error) };
}
