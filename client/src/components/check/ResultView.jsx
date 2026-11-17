import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Stamp from "../ui/Stamp";
import CheckClaim from "./CheckClaim";
import CheckRow from "./CheckRow";
import SourceCard from "./SourceCard";
import FeedbackBar from "./FeedbackBar";
import OwnerControls from "./OwnerControls";
import ShareRail from "./ShareRail";
import { getRelated } from "../../lib/checks";
import { checkKeys } from "../../lib/queryKeys";
import { formatDateFr, formatDateShortFr, plural } from "../../lib/format";
import { SCALE, kindLabel, verdictInfo } from "../../lib/verdict";
import { boldSegments } from "../../lib/explanation";
import styles from "./ResultView.module.css";

const SEGMENTS = 5;

const sentence = (label) => label.charAt(0) + label.slice(1).toLowerCase();
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const paragraphs = (text) =>
    (text || "")
        .split(/\n\s*\n|\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean);

function Confidence({ check }) {
    const date = formatDateFr(check.completed_at || check.created_at);
    const count = check.sources?.length ?? 0;
    const line = capitalize(
        [count > 0 ? plural(count, "source", "sources") : "", date ? `vérifié le ${date}` : ""].filter(Boolean).join(", ")
    );
    if (check.confidence == null) {
        return <div className={styles.conf}>{line && <span className={styles.confLine}>{line}</span>}</div>;
    }
    const value = Math.max(0, Math.min(100, Math.round(check.confidence)));
    const on = Math.round((value / 100) * SEGMENTS);
    return (
        <div className={styles.conf}>
            <b className={styles.confValue}>Confiance : {value} %</b>
            <span className={styles.segs} aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, index) => (
                    <i key={index} className={index < on ? styles.segOn : undefined} />
                ))}
            </span>
            {line && <span className={styles.confLine}>{line}</span>}
        </div>
    );
}

function Scale({ verdict, tone }) {
    if (!SCALE.includes(verdict)) return null;
    return (
        <ol className={styles.scale} aria-label="Échelle des verdicts" role="list">
            {SCALE.map((step) => {
                const at = step === verdict;
                return (
                    <li
                        key={step}
                        className={at ? [styles.at, styles[tone]].join(" ") : undefined}
                        aria-current={at ? "true" : undefined}
                    >
                        {sentence(verdictInfo(step).label)}
                        {at && <span className="sr-only"> (ce verdict)</span>}
                    </li>
                );
            })}
        </ol>
    );
}

function Related({ id }) {
    const { data } = useQuery({
        queryKey: checkKeys.related(id),
        queryFn: () => getRelated(id),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
    if (!Array.isArray(data) || data.length === 0) return null;
    return (
        <section className={styles.related} aria-labelledby={`related-${id}`}>
            <h2 id={`related-${id}`} className={styles.relatedTitle}>
                Vérifications proches
            </h2>
            <ul role="list">
                {data.slice(0, 3).map((item) => (
                    <li key={item.id}>
                        <CheckRow check={item} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Crumb({ check, isLoggedIn }) {
    let parent = null;
    if (check.listed) parent = { to: "/bibliotheque", label: "Bibliothèque" };
    else if (check.is_owner && isLoggedIn) parent = { to: "/mes-verifications", label: "Mes vérifications" };
    return (
        <div className={styles.crumbRow}>
            <nav aria-label="Fil d'Ariane" className={styles.crumb}>
                {parent && (
                    <>
                        <Link to={parent.to}>{parent.label}</Link>
                        <span aria-hidden="true"> / </span>
                    </>
                )}
                <b aria-current="page">Vérification {check.id.toUpperCase()}</b>
            </nav>
            <span className={styles.ai}>Vérification automatique par IA</span>
        </div>
    );
}

/**
 * Finished check (mockup screen 3). The ref goes on the verdict <h1>.
 * @param {{check: import("../../lib/checks").Check, elapsedSeconds: number, isLoggedIn: boolean,
 *   animate?: boolean, onDeleted?: () => void}} props `animate` stamps the verdict in
 *   (when the result has just arrived).
 */
const ResultView = forwardRef(function ResultView({ check, elapsedSeconds, isLoggedIn, animate = false, onDeleted }, headingRef) {
    const info = verdictInfo(check.verdict);
    const sources = check.sources ?? [];
    const why = paragraphs(check.explanation);
    const isOwner = Boolean(check.is_owner && isLoggedIn);
    const checkedOn = formatDateShortFr(check.completed_at || check.created_at);

    return (
        <div className={styles.page}>
            <Crumb check={check} isLoggedIn={isLoggedIn} />
            <div className={styles.layout}>
                <div className={styles.main}>
                    <CheckClaim check={check} />

                    <div className={styles.vline}>
                        <h1 ref={headingRef} tabIndex={-1} className={styles.verdict}>
                            {info ? (
                                <>
                                    <span className="sr-only">Verdict : </span>
                                    <Stamp verdict={check.verdict} animate={animate} />
                                </>
                            ) : (
                                <span className={styles.analysis}>
                                    {check.kind === "text" ? "Analyse" : "Analyse de l'image"}
                                </span>
                            )}
                        </h1>
                        <Confidence check={check} />
                    </div>

                    {info && <Scale verdict={check.verdict} tone={info.tone} />}

                    {why.length > 0 && (
                        <section aria-labelledby={`why-${check.id}`}>
                            <h2 id={`why-${check.id}`} className={styles.h2}>
                                Pourquoi
                            </h2>
                            <div className={styles.why}>
                                {why.map((text, index) => (
                                    <p key={index}>
                                        {boldSegments(text).map((segment, at) =>
                                            segment.strong ? <strong key={at}>{segment.text}</strong> : segment.text
                                        )}
                                    </p>
                                ))}
                            </div>
                        </section>
                    )}

                    {sources.length > 0 && (
                        <section aria-labelledby={`sources-${check.id}`}>
                            <h2 id={`sources-${check.id}`} className={styles.h2}>
                                Sources <small>{plural(sources.length, "source", "sources")}</small>
                            </h2>
                            <ol className={styles.sources} role="list">
                                {sources.map((source, index) => (
                                    <li key={`${source.url}-${index}`}>
                                        <SourceCard source={source} index={index + 1} />
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    <FeedbackBar checkId={check.id} hasVerdict={Boolean(info)} />
                    <Related id={check.id} />
                </div>

                <aside className={styles.rail} aria-label="Partage et détails">
                    <ShareRail check={check} isLoggedIn={isLoggedIn} />
                    {isOwner && <OwnerControls check={check} onDeleted={onDeleted} />}
                    <div className={styles.caveat}>
                        <b>Check-IA peut se tromper</b>
                        Consultez les sources avant de citer.{" "}
                        <Link to="/fiabilite">Comment nous évaluons notre fiabilité</Link>
                    </div>
                    <div role="group" aria-label="Détails de la vérification" className={styles.details}>
                        <dl>
                            {checkedOn && (
                                <div>
                                    <dt>Vérifié le</dt>
                                    <dd>{checkedOn}</dd>
                                </div>
                            )}
                            <div>
                                <dt>Type</dt>
                                <dd>{kindLabel(check.kind) || "Vérification"}</dd>
                            </div>
                            {check.completed_at && (
                                <div>
                                    <dt>Durée</dt>
                                    <dd>{elapsedSeconds} s</dd>
                                </div>
                            )}
                            {check.kind === "text" && (
                                <div>
                                    <dt>Sources</dt>
                                    <dd>{sources.length}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </aside>
            </div>
        </div>
    );
});

export default ResultView;
