// Verdict vocabulary shown to users (spec 5.4 and 13.7).

const VERDICTS = {
    vrai: { label: "VRAI", tone: "green" },
    faux: { label: "FAUX", tone: "red" },
    incertain: { label: "INCERTAIN", tone: "amber" },
    ia_detectee: { label: "GÉNÉRÉE PAR IA", tone: "red" },
    ia_non_detectee: { label: "PAS D'IA DÉTECTÉE", tone: "navy" },
};

/**
 * Stamp label and colour tone for a verdict.
 * @param {string | null | undefined} verdict
 * @returns {{label: string, tone: "green"|"red"|"amber"|"navy"} | null} null for "analyse", null or unknown values.
 */
export function verdictInfo(verdict) {
    return Object.prototype.hasOwnProperty.call(VERDICTS, verdict ?? "") ? { ...VERDICTS[verdict] } : null;
}

/** Verdicts a finished check may be listed (published) with. */
export const LISTABLE_VERDICTS = Object.freeze(Object.keys(VERDICTS));

/** Rating scale shown under the stamp, left to right. "Trompeur" is not shipped (spec 13.10). */
export const SCALE = Object.freeze(["faux", "incertain", "vrai"]);

const STATE_LABELS = {
    running: "En cours",
    done: "Terminée",
    error: "Erreur",
    cancelled: "Annulée",
};

/** @param {string} state @returns {string} French label for a check state, "" if unknown. */
export function stateLabel(state) {
    return STATE_LABELS[state] ?? "";
}

const KIND_LABELS = {
    text: "Texte",
    image_content: "Image",
    image_ai: "Détection d'image IA",
};

/** @param {string} kind @returns {string} French label for a check kind, "" if unknown. */
export function kindLabel(kind) {
    return KIND_LABELS[kind] ?? "";
}
