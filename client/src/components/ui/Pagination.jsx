import Icon from "./Icon";
import styles from "./Pagination.module.css";

/** Page numbers to show: first, last, current ±1, with "…" gaps. */
function pageItems(page, pageCount) {
    const pages = new Set([1, pageCount, page - 1, page, page + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
    const items = [];
    sorted.forEach((p, index) => {
        if (index > 0 && p - sorted[index - 1] > 1) items.push(`gap-${p}`);
        items.push(p);
    });
    return items;
}

/**
 * Server-side pagination control. Renders nothing when pageCount ≤ 1.
 * @param {{page: number, pageCount: number, onChange: (page: number) => void}} props 1-based pages.
 */
export default function Pagination({ page, pageCount, onChange }) {
    if (!pageCount || pageCount <= 1) return null;

    return (
        <nav className={styles.nav} aria-label="Pagination">
            <button
                type="button"
                className={styles.step}
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
            >
                <Icon name="chevron-left" />
                Page précédente
            </button>
            <ul className={styles.pages} role="list">
                {pageItems(page, pageCount).map((item) =>
                    typeof item === "string" ? (
                        <li key={item} className={styles.gap} aria-hidden="true">
                            …
                        </li>
                    ) : (
                        <li key={item}>
                            <button
                                type="button"
                                className={styles.page}
                                aria-label={`Page ${item}`}
                                aria-current={item === page ? "page" : undefined}
                                onClick={() => onChange(item)}
                            >
                                {item}
                            </button>
                        </li>
                    )
                )}
            </ul>
            <button
                type="button"
                className={styles.step}
                onClick={() => onChange(page + 1)}
                disabled={page >= pageCount}
            >
                Page suivante
                <Icon name="chevron-right" />
            </button>
        </nav>
    );
}
