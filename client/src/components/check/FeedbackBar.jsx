import { useId, useState } from "react";
import Button from "../ui/Button";
import Field from "../ui/Field";
import Notice from "../ui/Notice";
import { errorMessageFr } from "../../lib/api";
import { sendFeedback } from "../../lib/checks";
import styles from "./FeedbackBar.module.css";

const MESSAGE_MAX = 1000;

/**
 * "Ce verdict vous semble-t-il juste ?" Oui / Non, and "Signaler une erreur" with a short
 * optional text. Signed-out visitors may send it too (spec 13.8).
 * @param {{checkId: string, hasVerdict?: boolean}} props `hasVerdict` false words it for an analysis.
 */
export default function FeedbackBar({ checkId, hasVerdict = true }) {
    const formId = `report${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const [sent, setSent] = useState(""); // "" | "vote" | "report"
    const [sending, setSending] = useState(null); // null | "yes" | "no" | "report"
    const [error, setError] = useState("");
    const [reportOpen, setReportOpen] = useState(false);
    const [message, setMessage] = useState("");

    const send = async (which, payload, kind) => {
        setError("");
        setSending(which);
        try {
            await sendFeedback(checkId, payload);
            setSent(kind);
            setReportOpen(false);
        } catch (err) {
            setError(errorMessageFr(err));
        } finally {
            setSending(null);
        }
    };

    const submitReport = (event) => {
        event.preventDefault();
        send("report", { helpful: false, message: message.trim() }, "report");
    };

    return (
        <section className={styles.bar} aria-label="Votre avis">
            {sent ? (
                <p className={styles.thanks} role="status">
                    {sent === "report" ? "Merci, votre signalement a été envoyé." : "Merci pour votre avis."}
                </p>
            ) : (
                <div className={styles.row}>
                    <p className={styles.question}>
                        {hasVerdict ? "Ce verdict vous semble-t-il juste ?" : "Cette analyse vous semble-t-elle juste ?"}
                    </p>
                    <div className={styles.votes}>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={styles.vote}
                            loading={sending === "yes"}
                            disabled={Boolean(sending)}
                            onClick={() => send("yes", { helpful: true }, "vote")}
                        >
                            Oui
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={styles.vote}
                            loading={sending === "no"}
                            disabled={Boolean(sending)}
                            onClick={() => send("no", { helpful: false }, "vote")}
                        >
                            Non
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={styles.report}
                        aria-expanded={reportOpen}
                        aria-controls={formId}
                        onClick={() => setReportOpen((open) => !open)}
                    >
                        Signaler une erreur
                    </Button>
                </div>
            )}

            {!sent && reportOpen && (
                <form id={formId} className={styles.form} onSubmit={submitReport}>
                    <Field
                        label="Qu'est-ce qui ne va pas ? (facultatif)"
                        hint="Par exemple : une source mal lue, une date fausse."
                        multiline
                        rows={3}
                        maxLength={MESSAGE_MAX}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                    <div className={styles.formActions}>
                        <Button type="submit" size="sm" loading={sending === "report"} disabled={Boolean(sending)}>
                            Envoyer le signalement
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>
                            Fermer
                        </Button>
                    </div>
                </form>
            )}

            {error && (
                <Notice tone="error" className={styles.error}>
                    {error}
                </Notice>
            )}
        </section>
    );
}
