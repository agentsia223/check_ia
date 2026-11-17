import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import CheckRow from "./CheckRow";
import Button from "../ui/Button";
import Field from "../ui/Field";
import Notice from "../ui/Notice";
import Pagination from "../ui/Pagination";
import { errorMessageFr } from "../../lib/api";
import { listChecks } from "../../lib/checks";
import { checkKeys } from "../../lib/queryKeys";
import { plural } from "../../lib/format";
import styles from "./CheckList.module.css";

const DEBOUNCE_MS = 300;
const VERDICTS = [
    ["", "Tous"],
    ["vrai", "Vrai"],
    ["faux", "Faux"],
    ["incertain", "Incertain"],
];
const SKELETON_ROWS = 5;

/**
 * Searchable, filterable, paginated list of checks. `q`, `verdict` and `page` live in the
 * URL query string. Changing search or filter returns to page 1.
 * @param {{scope?: "library"|"mine", emptyTitle: string, emptyText?: string,
 *   emptyAction?: {label: string, to: string}}} props `scope="mine"` is the signed-in
 *   history: always refetched, rows show kind and published state.
 */
export default function CheckList({ scope = "library", emptyTitle, emptyText, emptyAction }) {
    const [params, setParams] = useSearchParams();
    const q = params.get("q") || "";
    const verdict = VERDICTS.some(([value]) => value === params.get("verdict")) ? params.get("verdict") || "" : "";
    const pageParam = parseInt(params.get("page") || "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const mine = scope === "mine";

    const [text, setText] = useState(q);
    const committed = useRef(q);
    const listTop = useRef(null);

    const update = (changes, { replace = false } = {}) => {
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                Object.entries(changes).forEach(([key, value]) => {
                    if (value) next.set(key, String(value));
                    else next.delete(key);
                });
                return next;
            },
            { replace }
        );
    };

    // Debounced search → URL.
    useEffect(() => {
        if (text === committed.current) return undefined;
        const timer = setTimeout(() => {
            committed.current = text;
            update({ q: text.trim(), page: "" });
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    // URL → field (back button, reset).
    useEffect(() => {
        if (q !== committed.current.trim()) {
            committed.current = q;
            setText(q);
        }
    }, [q]);

    const query = useQuery({
        queryKey: checkKeys.list(scope, { q, verdict, page }),
        queryFn: () => listChecks({ scope, q, verdict, page }),
        placeholderData: keepPreviousData,
        ...(mine ? { staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true } : {}),
    });

    // Page change → back to the top of the list.
    const previousPage = useRef(page);
    useEffect(() => {
        if (previousPage.current !== page) {
            previousPage.current = page;
            listTop.current?.scrollIntoView?.({ block: "start" });
        }
    }, [page]);

    const filtered = Boolean(q || verdict);
    const data = query.data;
    const pageCount = data ? Math.ceil(data.count / (data.page_size || 20)) : 0;
    // A page past the end (old link, hand-edited URL, items deleted): go to the last page.
    const pastTheEnd = Boolean(data) && !query.isPlaceholderData && data.count > 0 && data.results.length === 0 && page > 1;

    useEffect(() => {
        if (pastTheEnd) update({ page: pageCount > 1 ? pageCount : "" }, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pastTheEnd, pageCount]);

    const reset = () => {
        committed.current = "";
        setText("");
        setParams({});
    };

    let body;
    if (query.isPending || pastTheEnd) {
        body = (
            <ul className={styles.skeletons} data-testid="check-skeleton" aria-hidden="true">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <li key={i} className={styles.skeleton} />
                ))}
            </ul>
        );
    } else if (query.isError && !data) {
        body = (
            <div className={styles.state}>
                <Notice tone="error">{errorMessageFr(query.error)}</Notice>
                <Button variant="secondary" onClick={() => query.refetch()}>
                    Réessayer
                </Button>
            </div>
        );
    } else if (data.results.length === 0) {
        body = filtered ? (
            <div className={styles.state}>
                <h2 className={styles.stateTitle}>Aucun résultat</h2>
                <p className={styles.stateText}>Essayez d'autres mots ou un autre verdict.</p>
                <Button variant="secondary" onClick={reset}>
                    Réinitialiser les filtres
                </Button>
            </div>
        ) : (
            <div className={styles.state}>
                <h2 className={styles.stateTitle}>{emptyTitle}</h2>
                {emptyText && <p className={styles.stateText}>{emptyText}</p>}
                {emptyAction && <Button to={emptyAction.to}>{emptyAction.label}</Button>}
            </div>
        );
    } else {
        body = (
            <>
                <ul className={styles.list} aria-label="Vérifications" aria-busy={query.isPlaceholderData || undefined}>
                    {data.results.map((check) => (
                        <li key={check.id}>
                            <CheckRow check={check} showKind={mine} showListed={mine} />
                        </li>
                    ))}
                </ul>
                <Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next > 1 ? next : "" })} />
            </>
        );
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.toolbar}>
                <Field
                    className={styles.search}
                    label="Rechercher"
                    type="search"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Un mot de l'affirmation"
                    autoComplete="off"
                />
                <div className={styles.filter}>
                    <label className={styles.filterLabel} htmlFor={`verdict-${scope}`}>
                        Verdict
                    </label>
                    <select
                        id={`verdict-${scope}`}
                        className={styles.select}
                        value={verdict}
                        onChange={(event) => update({ verdict: event.target.value, page: "" })}
                    >
                        {VERDICTS.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div ref={listTop} className={styles.head}>
                <p className={styles.count} role="status" aria-live="polite">
                    {data && !pastTheEnd ? (
                        plural(data.count, "vérification", "vérifications")
                    ) : query.isPending || pastTheEnd ? (
                        <span className="sr-only">Chargement…</span>
                    ) : (
                        ""
                    )}
                </p>
            </div>
            {body}
        </div>
    );
}
