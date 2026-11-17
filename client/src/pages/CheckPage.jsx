import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import ProgressView from "../components/check/ProgressView";
import ResultView from "../components/check/ResultView";
import StoppedView from "../components/check/StoppedView";
import { useAuth } from "../auth/AuthContext";
import { useCheck } from "../hooks/useCheck";
import { usePageTitle } from "../hooks/usePageTitle";
import { verdictInfo } from "../lib/verdict";
import fiabilite from "../data/fiabilite";
import styles from "./CheckPage.module.css";

const TITLE_CLAIM_MAX = 60;

/** Keep `<meta name="robots" content="noindex">` in the head while `active`. */
function useNoindex(active) {
    useEffect(() => {
        if (!active) return undefined;
        const meta = document.createElement("meta");
        meta.name = "robots";
        meta.content = "noindex";
        document.head.appendChild(meta);
        return () => meta.remove();
    }, [active]);
}

const shorten = (text) => {
    const clean = (text || "").trim().replace(/\s+/g, " ");
    return clean.length > TITLE_CLAIM_MAX ? `${clean.slice(0, TITLE_CLAIM_MAX - 1).trimEnd()}…` : clean;
};

function pageTitle(status, check) {
    if (status === "notfound") return "Vérification introuvable";
    if (status === "running") return "Vérification en cours";
    if (status === "done") {
        const info = verdictInfo(check?.verdict);
        const claim = shorten(check?.claim);
        if (info) {
            // Sentence case, keeping the acronym: "Générée par IA", "Pas d'IA détectée".
            const label = (info.label.charAt(0) + info.label.slice(1).toLowerCase()).replace(/\bia\b/g, "IA");
            return claim ? `${label} : ${claim}` : label;
        }
        return claim ? `Analyse : ${claim}` : "Analyse";
    }
    return "Vérification";
}

/** The check could not be loaded (server error, network, refused request). */
function UnreachableView({ onReload }) {
    const [reloading, setReloading] = useState(false);
    const reload = async () => {
        setReloading(true);
        try {
            await onReload();
        } finally {
            setReloading(false);
        }
    };
    return (
        <div className={styles.notFound}>
            <h1>La vérification n'a pas pu être chargée</h1>
            <p>Connexion impossible. Vérifiez votre connexion internet, puis réessayez.</p>
            <div className={styles.actions}>
                <Button onClick={reload} loading={reloading}>
                    Réessayer
                </Button>
                <Button variant="ghost" to="/">
                    Nouvelle vérification
                </Button>
            </div>
        </div>
    );
}

function announcement(status, check) {
    if (status === "done") {
        const info = verdictInfo(check?.verdict);
        return info ? `Verdict : ${info.label}` : "Analyse terminée";
    }
    if (status === "error") return "La vérification n'a pas abouti.";
    if (status === "cancelled") return "Vérification annulée.";
    if (status === "timeout") return "La vérification prend plus de temps que prévu.";
    return "";
}

function CheckScreen({ id }) {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();
    const { check, status, elapsedSeconds, networkTrouble, cancel, retry, reload } = useCheck(id);
    const headingRef = useRef(null);
    const sawRunning = useRef(false);
    const previousStatus = useRef(status);
    const [live, setLive] = useState("");

    if (status === "running") sawRunning.current = true;
    const arrived = sawRunning.current && status === "done";

    usePageTitle(pageTitle(status, check));
    useNoindex(check?.listed !== true);

    // When the result (or another end state) arrives while watching, move focus to its
    // heading and announce it in the polite live region.
    useEffect(() => {
        const previous = previousStatus.current;
        previousStatus.current = status;
        if (previous !== "running" || status === "running") return;
        setLive(announcement(status, check));
        headingRef.current?.focus();
    }, [status, check]);

    let view;
    if (status === "loading") {
        view = (
            <div className={styles.loading}>
                <h1 className="sr-only">Vérification</h1>
                <p role="status" className={styles.loadingText}>
                    <span className={styles.spinner} aria-hidden="true" />
                    Chargement de la vérification…
                </p>
            </div>
        );
    } else if (status === "unreachable") {
        view = <UnreachableView onReload={reload} />;
    } else if (status === "notfound") {
        view = (
            <div className={styles.notFound}>
                <h1>Vérification introuvable</h1>
                <p>Le lien est peut-être incomplet, ou la vérification a été supprimée.</p>
                <Button to="/">Nouvelle vérification</Button>
            </div>
        );
    } else if (status === "running") {
        view = (
            <ProgressView
                check={check}
                elapsedSeconds={elapsedSeconds}
                medianSeconds={fiabilite.medianSeconds}
                networkTrouble={networkTrouble}
                canCancel={Boolean(check.is_owner)}
                onCancel={cancel}
                isLoggedIn={isLoggedIn}
            />
        );
    } else if (status === "done") {
        view = (
            <ResultView
                ref={headingRef}
                check={check}
                elapsedSeconds={elapsedSeconds}
                isLoggedIn={isLoggedIn}
                animate={arrived}
                onDeleted={() => navigate(isLoggedIn ? "/mes-verifications" : "/", { replace: true })}
            />
        );
    } else {
        view = <StoppedView ref={headingRef} check={check} status={status} onRetry={retry} />;
    }

    return (
        <>
            {view}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {live}
            </p>
        </>
    );
}

/** Check page, `/v/:id`: a check in progress, then its result (spec 5.3, 5.4). */
export default function CheckPage() {
    const { id } = useParams();
    // A new id (after "Réessayer") starts a fresh screen: timers, focus and announcements reset.
    return <CheckScreen key={id} id={id} />;
}
