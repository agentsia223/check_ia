import { Link } from "react-router-dom";
import Stamp from "../ui/Stamp";
import { kindLabel, stateLabel, verdictInfo } from "../../lib/verdict";
import { plural, relativeTimeFr } from "../../lib/format";
import styles from "./CheckRow.module.css";

function StatusMark({ check }) {
    if (check.state === "done" && verdictInfo(check.verdict)) {
        return <Stamp verdict={check.verdict} size="sm" className={styles.stamp} />;
    }
    const label = check.state === "done" ? "Analyse" : stateLabel(check.state);
    return <span className={[styles.status, styles[check.state]].filter(Boolean).join(" ")}>{label}</span>;
}

/**
 * One check in a list (recent checks, library, history, related). Wrap it in an <li>
 * inside a list. The whole row links to /v/<id>.
 * @param {{check: import("../../lib/checks").CheckSummary, showKind?: boolean,
 *   showListed?: boolean}} props `showKind` and `showListed` add the type and
 *   "Publiée"/"Non publiée" to the meta line (history).
 */
export default function CheckRow({ check, showKind = false, showListed = false }) {
    const title = check.claim || (check.kind === "text" ? "Vérification sans texte" : "Image sans texte");
    const meta = [
        showKind ? kindLabel(check.kind) : null,
        // Image checks have no sources: no "0 source".
        check.state === "done" && check.source_count > 0 ? plural(check.source_count, "source", "sources") : null,
        relativeTimeFr(check.created_at),
    ]
        .filter(Boolean)
        .join(", ");

    return (
        <Link to={`/v/${check.id}`} className={styles.row}>
            <span className={styles.mark}>
                <StatusMark check={check} />
            </span>
            <span className={styles.text}>
                <span className={styles.claim}>{title}</span>
                <span className={styles.meta}>
                    {meta}
                    {showListed && (
                        <span className={styles.visibility}>{check.listed ? " · Publiée" : " · Non publiée"}</span>
                    )}
                </span>
            </span>
        </Link>
    );
}
