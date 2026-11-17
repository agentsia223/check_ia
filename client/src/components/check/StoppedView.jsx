import { forwardRef, useState } from "react";
import Button from "../ui/Button";
import CheckClaim from "./CheckClaim";
import CreateFailureNotice from "./CreateFailureNotice";
import { useAuth } from "../../auth/AuthContext";
import { describeCreateFailure } from "../../lib/createFailure";
import styles from "./StoppedView.module.css";

const COPY = {
    error: {
        title: "La vérification n'a pas abouti",
        text: "Check-IA n'a pas pu terminer cette vérification. Relancez-la, ou réessayez dans quelques minutes.",
        retry: "Relancer la vérification",
    },
    cancelled: {
        title: "Vérification annulée",
        text: "Cette vérification a été arrêtée avant son résultat.",
        retry: "Relancer la vérification",
    },
    timeout: {
        title: "La vérification prend plus de temps que prévu",
        text: "Le résultat n'est pas arrivé après 3 minutes. Réessayez, ou revenez plus tard sur ce lien : il reste valable.",
        retry: "Réessayer",
    },
};

/**
 * A check that ended without a result: error, cancelled, or client timeout. No stamp.
 * Text checks can be run again (a new check with the same claim); image checks link home.
 * Private to CheckPage. The ref goes on the <h1> (focused when the state arrives).
 * @param {{check: import("../../lib/checks").Check, status: "error"|"cancelled"|"timeout",
 *   onRetry: () => Promise<void>}} props
 */
const StoppedView = forwardRef(function StoppedView({ check, status, onRetry }, headingRef) {
    const copy = COPY[status] ?? COPY.error;
    const [retrying, setRetrying] = useState(false);
    const [failure, setFailure] = useState(null);
    const { isLoggedIn } = useAuth();
    const isText = check.kind === "text" && Boolean((check.claim || "").trim());

    const retry = async () => {
        setFailure(null);
        setRetrying(true);
        try {
            await onRetry();
        } catch (err) {
            // Same wording as the composer, including the sign-up prompt for anon_quota.
            setFailure(describeCreateFailure(err));
            setRetrying(false);
        }
    };

    return (
        <div className={styles.page}>
            <CheckClaim check={check} />
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
                {copy.title}
            </h1>
            <p className={styles.text}>{copy.text}</p>
            {failure && <CreateFailureNotice failure={failure} isLoggedIn={isLoggedIn} />}
            <div className={styles.actions}>
                {isText ? (
                    <>
                        <Button onClick={retry} loading={retrying}>
                            {copy.retry}
                        </Button>
                        <Button variant="ghost" to="/">
                            Nouvelle vérification
                        </Button>
                    </>
                ) : (
                    <Button to="/">Nouvelle vérification</Button>
                )}
            </div>
        </div>
    );
});

export default StoppedView;
