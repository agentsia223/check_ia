import { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Composer from "../components/check/Composer";
import CheckRow from "../components/check/CheckRow";
import OutcomeBar from "../components/check/OutcomeBar";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useAuth } from "../auth/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { apiFetch } from "../lib/api";
import { listChecks } from "../lib/checks";
import { checkKeys } from "../lib/queryKeys";
import { fiabilite, pctFr } from "../data/fiabilite";
import styles from "./Home.module.css";

const RECENT_COUNT = 4;

function RecentChecks() {
    const headingId = `recent${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const query = useQuery({
        queryKey: checkKeys.recent(),
        queryFn: () => listChecks({ scope: "library" }),
    });
    const results = query.data?.results ?? [];

    let body;
    if (query.isPending) {
        body = (
            <div className={styles.recentLoading}>
                <p role="status" className="sr-only">
                    Chargement des vérifications récentes…
                </p>
                {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.skeletonRow} aria-hidden="true">
                        <span className={styles.skeletonMark} />
                        <span className={styles.skeletonText} />
                    </div>
                ))}
            </div>
        );
    } else if (query.isError) {
        body = (
            <div className={styles.recentMessage}>
                <p>Les vérifications récentes n'ont pas pu être chargées. Vérifiez votre connexion internet, puis réessayez.</p>
                <Button size="sm" variant="secondary" onClick={() => query.refetch()} loading={query.isFetching}>
                    Réessayer
                </Button>
            </div>
        );
    } else if (results.length === 0) {
        body = (
            <p className={styles.recentMessage}>
                Aucune vérification publiée pour le moment. Les vérifications publiées apparaîtront ici.
            </p>
        );
    } else {
        body = (
            <ul role="list" className={styles.recentList}>
                {results.slice(0, RECENT_COUNT).map((check) => (
                    <li key={check.id}>
                        <CheckRow check={check} />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <section aria-labelledby={headingId} className={styles.recent}>
            <div className={styles.recentHead}>
                <h2 id={headingId}>Vérifications récentes</h2>
                <Link to="/bibliotheque" className={styles.recentAll}>
                    Toute la bibliothèque
                </Link>
            </div>
            {body}
        </section>
    );
}

function ReliabilityBand() {
    const headingId = `trust${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const { date, nPrimary, correct, prudence, wrong } = fiabilite;
    const outcomes = [
        { key: "correct", value: correct, color: "var(--green-500)", label: "verdict correct" },
        { key: "prudence", value: prudence, color: "var(--navy-300)", label: "prudence, pas de verdict" },
        { key: "wrong", value: wrong, color: "var(--red-500)", label: "verdict erroné" },
    ];
    const barLabel =
        `Répartition des issues : ${pctFr(correct)} verdict correct, ` +
        `${pctFr(prudence)} prudence, ${pctFr(wrong)} verdict erroné.`;

    return (
        <section aria-labelledby={headingId} className={styles.band}>
            <div className={styles.bandInner}>
                <div>
                    <h2 id={headingId} className={styles.bandTitle}>
                        Quand Check-IA n'est pas sûr, il ne tranche pas.
                    </h2>
                    <p className={styles.bandText}>
                        Évalué en {date} sur {nPrimary} affirmations réelles au Mali.{" "}
                        <Link to="/fiabilite" className={styles.bandLink}>
                            Lire la méthode
                        </Link>
                    </p>
                </div>
                <div>
                    <OutcomeBar
                        size="sm"
                        ariaLabel={barLabel}
                        segments={outcomes.map(({ key, value, color }) => ({ key, value, color }))}
                    />
                    <ul role="list" className={styles.legend}>
                        {outcomes.map((outcome) => (
                            <li key={outcome.key}>
                                <b className={styles.legendValue}>{pctFr(outcome.value)}</b>
                                <span className={styles.legendLabel}>
                                    <span
                                        className={styles.swatch}
                                        style={{ background: outcome.color }}
                                        aria-hidden="true"
                                    />
                                    {outcome.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/** Home (`/`): headline, composer, facts, recent listed checks, reliability band (spec 5.2). */
export default function Home() {
    usePageTitle("Vérifier une information");
    const { isLoggedIn } = useAuth();

    // Wake the (sleeping) verdict model as soon as the page opens, so it is ready by the
    // time the claim is typed. The endpoint needs a session; failures are ignored.
    useEffect(() => {
        if (!isLoggedIn) return;
        Promise.resolve(apiFetch("verdict/warm/", { method: "POST" })).catch(() => {});
    }, [isLoggedIn]);

    return (
        <div className={styles.home}>
            <div className={styles.hero}>
                <div className={styles.lead}>
                    <h1 className={styles.headline}>Vérifiez avant de publier.</h1>
                    <p className={styles.lede}>
                        Collez une affirmation. Check-IA cherche les sources et rend un verdict que vous pouvez citer.
                    </p>
                    <Composer />
                    <ul role="list" aria-label="En bref" className={styles.facts}>
                        {!isLoggedIn && (
                            <li>
                                <Icon name="ok" className={styles.factIcon} />
                                Une vérification gratuite sans compte
                            </li>
                        )}
                        <li>
                            <Icon name="ok" className={styles.factIcon} />
                            {`Réponse en ${fiabilite.medianSeconds} secondes environ`}
                        </li>
                    </ul>
                </div>
                <RecentChecks />
            </div>
            <ReliabilityBand />
        </div>
    );
}
