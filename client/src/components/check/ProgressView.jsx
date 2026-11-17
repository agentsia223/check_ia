import { useState } from "react";
import Button from "../ui/Button";
import Notice from "../ui/Notice";
import CheckClaim from "./CheckClaim";
import { errorMessageFr } from "../../lib/api";
import { plural } from "../../lib/format";
import fiabilite from "../../data/fiabilite";
import styles from "./ProgressView.module.css";

/** The four named steps (spec 5.3). The backend reports no stages: they advance on a timed estimate. */
export const STEPS = Object.freeze([
    "Lecture de l'affirmation",
    "Recherche de sources",
    "Comparaison des sources",
    "Verdict",
]);

/** Image checks search no sources: their steps say what the analysis really does. */
const IMAGE_STEPS = Object.freeze({
    image_content: Object.freeze([
        "Lecture de l'image",
        "Analyse du contenu",
        "Comparaison avec le texte reçu",
        "Verdict",
    ]),
    image_ai: Object.freeze([
        "Lecture de l'image",
        "Recherche d'indices de génération par IA",
        "Évaluation des indices",
        "Verdict",
    ]),
});

/** Step names for a kind of check. @param {string} [kind] @returns {readonly string[]} */
export const stepsFor = (kind) => IMAGE_STEPS[kind] ?? STEPS;

/** Seconds after which steps 1 and 2 are shown as done. */
const READ_DONE_AT = 2;
const SEARCH_DONE_AT = 12;

/**
 * State of each step for a given elapsed time. "Comparaison des sources" stays current
 * until the result; "Verdict" is done only when the check is done.
 * @param {number} elapsedSeconds @param {boolean} finished
 * @returns {Array<"done"|"current"|"pending">}
 */
export function stepStates(elapsedSeconds, finished) {
    if (finished) return ["done", "done", "done", "done"];
    if (elapsedSeconds < READ_DONE_AT) return ["current", "pending", "pending", "pending"];
    if (elapsedSeconds < SEARCH_DONE_AT) return ["done", "current", "pending", "pending"];
    return ["done", "done", "current", "pending"];
}

/**
 * Check in progress (mockup screen 2).
 * @param {{check: import("../../lib/checks").Check, elapsedSeconds: number, medianSeconds?: number,
 *   networkTrouble?: boolean, canCancel?: boolean, onCancel?: () => Promise<void>,
 *   isLoggedIn?: boolean, finished?: boolean}} props
 */
export default function ProgressView({
    check,
    elapsedSeconds,
    medianSeconds = fiabilite.medianSeconds,
    networkTrouble = false,
    canCancel = false,
    onCancel,
    isLoggedIn = false,
    finished = false,
}) {
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const steps = stepsFor(check.kind);
    const states = stepStates(elapsedSeconds, finished);
    const currentIndex = states.indexOf("current");
    const progress = Math.min(elapsedSeconds / Math.max(medianSeconds, 1), 0.95);

    const handleCancel = async () => {
        setCancelError("");
        setCancelling(true);
        try {
            await onCancel?.();
        } catch (error) {
            setCancelError(errorMessageFr(error));
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className={styles.layout}>
            <div className={styles.main}>
                <h1 className="sr-only">Vérification en cours</h1>
                <CheckClaim check={check} />

                <ol className={styles.steps} role="list">
                    {steps.map((step, index) => (
                        <li
                            key={step}
                            className={[styles.step, styles[states[index]]].join(" ")}
                            aria-current={states[index] === "current" ? "step" : undefined}
                        >
                            <span className={styles.marker} aria-hidden="true">
                                {states[index] === "done" ? "✓" : index + 1}
                            </span>
                            <span className={styles.label}>{step}</span>
                            {states[index] === "current" && <small className={styles.note}>en cours</small>}
                            {states[index] === "done" && <span className="sr-only"> (étape terminée)</span>}
                        </li>
                    ))}
                </ol>

                <div className={styles.meter} aria-hidden="true">
                    <span className={styles.meterFill} style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <div className={styles.meta}>
                    <p>
                        {/* Same wording as the home page's facts line: the figure is a median, not an average. */}
                        {plural(elapsedSeconds, "seconde écoulée", "secondes écoulées")}, réponse en{" "}
                        {plural(medianSeconds, "seconde", "secondes")} environ
                    </p>
                    {canCancel && (
                        <Button variant="secondary" size="sm" onClick={handleCancel} loading={cancelling}>
                            Annuler
                        </Button>
                    )}
                </div>

                {cancelError && (
                    <Notice tone="error" className={styles.notice}>
                        {cancelError}
                    </Notice>
                )}
                {networkTrouble && (
                    <Notice tone="warning" className={styles.notice}>
                        La connexion au serveur est interrompue. Nouvel essai automatique en cours.
                    </Notice>
                )}

                <p className="sr-only" aria-live="polite">
                    {currentIndex >= 0 ? `Étape en cours : ${steps[currentIndex]}` : ""}
                </p>
            </div>

            <aside className={styles.ghost}>
                <p className={styles.leave}>
                    <b>Vous pouvez quitter cette page.</b>{" "}
                    {isLoggedIn
                        ? "Le lien reste valable et le résultat apparaîtra dans Mes vérifications."
                        : "Le lien reste valable : gardez-le pour retrouver le résultat."}
                </p>
                <div aria-hidden="true">
                    <span className={styles.sk} style={{ width: "38%", height: 34 }} />
                    <span className={styles.sk} style={{ width: "92%" }} />
                    <span className={styles.sk} style={{ width: "84%" }} />
                    <span className={styles.sk} style={{ width: "60%" }} />
                    <span className={[styles.sk, styles.skBlock].join(" ")} style={{ marginTop: 20 }} />
                    <span className={[styles.sk, styles.skBlock].join(" ")} />
                </div>
            </aside>
        </div>
    );
}
