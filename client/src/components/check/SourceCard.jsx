import Icon from "../ui/Icon";
import { domainOf, formatDateShortFr } from "../../lib/format";
import styles from "./SourceCard.module.css";

const isHttp = (url) => {
    try {
        return ["http:", "https:"].includes(new URL(url).protocol);
    } catch {
        return false;
    }
};

const sourceDate = (date) => formatDateShortFr(date) || date || "";

/**
 * Numbered source card. No reliability or stance chip (spec 5.4, 13.10).
 * Links only to http(s) URLs, in a new tab.
 * @param {{source: import("../../lib/checks").Source, index: number}} props `index` is the 1-based number shown.
 */
export default function SourceCard({ source, index }) {
    const domain = source.domain || domainOf(source.url);
    const title = source.title || domain || "Source sans titre";
    const meta = [title === domain ? "" : domain, sourceDate(source.date)].filter(Boolean).join(", ");
    const linkable = isHttp(source.url);

    const content = (
        <>
            <span className={styles.number} aria-hidden={linkable ? "true" : undefined}>
                {index}
            </span>
            <span className={styles.body}>
                <span className={styles.title}>{title}</span>
                {meta && <span className={styles.meta}>{meta}</span>}
            </span>
            {linkable && (
                <>
                    <Icon name="out" className={styles.out} />
                    <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
                </>
            )}
        </>
    );

    if (!linkable) return <div className={styles.card}>{content}</div>;

    return (
        <a className={styles.card} href={source.url} target="_blank" rel="noopener noreferrer">
            {content}
        </a>
    );
}
