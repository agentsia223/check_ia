import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Notice from "../ui/Notice";
import { apiFetch, errorMessageFr } from "../../lib/api";
import { formatDateFr } from "../../lib/format";
import { verdictInfo } from "../../lib/verdict";
import styles from "./ShareRail.module.css";

const TRANSLATE_TIMEOUT_MS = 60000;
const COPIED_MS = 2500;

/** Public URL of a check page. @param {string} id */
export const checkUrl = (id) => `${window.location.origin}/v/${id}`;

/**
 * Text copied by "Citer dans un article":
 * « <claim> » — Verdict Check-IA : <label>, vérifié le <date>. <url>
 * @param {import("../../lib/checks").Check} check @param {string} url
 * @returns {string} "" when the check has no stamped verdict.
 */
export function citationText(check, url) {
    const info = verdictInfo(check.verdict);
    if (!info) return "";
    const claim = (check.claim || "").trim();
    const subject = claim ? `« ${claim} »` : "Image";
    const date = formatDateFr(check.completed_at || check.created_at);
    return `${subject} — Verdict Check-IA : ${info.label}, vérifié le ${date}. ${url}`;
}

async function copyText(text) {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
    await navigator.clipboard.writeText(text);
}

/**
 * "Partager ce verdict" card: copy link, native share where available, citation,
 * and the explanation in Bambara (text; signed-in only, spec 13.4).
 * On phones the actions become a bar pinned to the bottom of the result.
 * @param {{check: import("../../lib/checks").Check, isLoggedIn: boolean}} props
 */
export default function ShareRail({ check, isLoggedIn }) {
    const location = useLocation();
    const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const titleId = `share${baseId}`;
    const bambaraId = `bambara${baseId}`;
    const url = checkUrl(check.id);
    const info = verdictInfo(check.verdict);
    const citation = citationText(check, url);
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const explanation = (check.explanation || "").trim();

    const [status, setStatus] = useState("");
    const [copied, setCopied] = useState(""); // "" | "link" | "quote"
    const [bambara, setBambara] = useState(null); // {text} once loaded
    const [bambaraOpen, setBambaraOpen] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [translateError, setTranslateError] = useState("");
    const bambaraRef = useRef(null);
    const copiedTimer = useRef(null);

    useEffect(() => () => clearTimeout(copiedTimer.current), []);

    const copy = async (text, which, done) => {
        try {
            await copyText(text);
            setStatus(done);
            setCopied(which);
            clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(""), COPIED_MS);
        } catch {
            setCopied("");
            setStatus(
                which === "link"
                    ? "Copie impossible : sélectionnez le lien et copiez-le."
                    : `Copie impossible : sélectionnez ce texte et copiez-le. ${text}`
            );
        }
    };

    const share = async () => {
        try {
            await navigator.share({
                title: "Check-IA",
                text: info ? `Verdict Check-IA : ${info.label}` : "Vérification Check-IA",
                url,
            });
        } catch (error) {
            if (error?.name !== "AbortError") setStatus("Le partage n'a pas pu s'ouvrir. Copiez le lien à la place.");
        }
    };

    useEffect(() => {
        if (bambaraOpen && bambara) bambaraRef.current?.focus();
    }, [bambaraOpen, bambara]);

    const readBambara = async () => {
        if (bambara) {
            setBambaraOpen((open) => !open);
            return;
        }
        setTranslateError("");
        setTranslating(true);
        try {
            const result = await apiFetch("bambara/translate/", {
                method: "POST",
                json: { text: explanation, source_lang: "fr", target_lang: "bm" },
                timeoutMs: TRANSLATE_TIMEOUT_MS,
            });
            const text = (result?.translated_text || "").trim();
            if (!text) {
                setTranslateError("La traduction n'a pas pu être obtenue. Réessayez dans un instant.");
                return;
            }
            setBambara({ text });
            setBambaraOpen(true);
        } catch (error) {
            setTranslateError(errorMessageFr(error));
        } finally {
            setTranslating(false);
        }
    };

    return (
        <section className={styles.rail} aria-labelledby={titleId}>
            <h2 id={titleId} className={styles.title}>
                {info ? "Partager ce verdict" : "Partager cette vérification"}
            </h2>

            <div className={styles.actions}>
                <div className={styles.link}>
                    <input
                        className={styles.url}
                        type="text"
                        readOnly
                        value={url}
                        aria-label="Lien de la vérification"
                        onFocus={(event) => event.target.select()}
                    />
                    <button type="button" className={styles.copy} onClick={() => copy(url, "link", "Lien copié.")}>
                        <Icon name={copied === "link" ? "ok" : "copy"} className={styles.barIcon} />
                        {copied === "link" ? (
                            <span>
                                <span aria-hidden="true">Copié</span>
                                <span className="sr-only">Lien copié</span>
                            </span>
                        ) : (
                            <span>
                                Copier <span className="sr-only">le lien</span>
                            </span>
                        )}
                    </button>
                </div>

                {canShare && (
                    <Button className={styles.action} onClick={share}>
                        <Icon name="share" />
                        <span>Partager</span>
                    </Button>
                )}

                {citation && (
                    <Button
                        variant="secondary"
                        className={styles.action}
                        onClick={() => copy(citation, "quote", "Citation copiée.")}
                    >
                        <Icon name={copied === "quote" ? "ok" : "quote"} />
                        <span>
                            Citer <span className={styles.long}>dans un article</span>
                        </span>
                    </Button>
                )}

                {explanation &&
                    (isLoggedIn ? (
                        <Button
                            variant="secondary"
                            className={styles.action}
                            onClick={readBambara}
                            loading={translating}
                            aria-expanded={bambara ? bambaraOpen : undefined}
                            aria-controls={bambara ? bambaraId : undefined}
                        >
                            <Icon name="text" />
                            <span>
                                <span className={styles.long}>Lire en</span> <span className={styles.short}>bambara</span>
                            </span>
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            className={styles.action}
                            to="/connexion"
                            state={{ from: location }}
                            aria-describedby={`${bambaraId}-hint`}
                        >
                            <Icon name="text" />
                            <span>
                                <span className={styles.long}>Lire en</span> <span className={styles.short}>bambara</span>
                            </span>
                        </Button>
                    ))}
            </div>

            {explanation && !isLoggedIn && (
                <p id={`${bambaraId}-hint`} className={styles.hint}>
                    Connectez-vous pour lire l'explication en bambara.
                </p>
            )}

            <p className={styles.status} role="status">
                {status}
            </p>

            {translateError && (
                <Notice tone="error" className={styles.notice}>
                    {translateError}
                </Notice>
            )}

            {bambara && bambaraOpen && (
                <div id={bambaraId} className={styles.bambara} ref={bambaraRef} tabIndex={-1}>
                    <h3 className={styles.bambaraTitle}>Explication en bambara</h3>
                    <p lang="bm">{bambara.text}</p>
                    <p className={styles.bambaraNote}>Traduction automatique de l'explication.</p>
                </div>
            )}
        </section>
    );
}
