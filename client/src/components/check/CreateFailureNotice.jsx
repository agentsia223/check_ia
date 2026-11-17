import { useLocation } from "react-router-dom";
import Button from "../ui/Button";
import Notice from "../ui/Notice";
import styles from "./CreateFailureNotice.module.css";

/**
 * The notice shown when a check could not be created (see lib/createFailure.js).
 * `anon_quota` invites the visitor to sign up or sign in (returning here afterwards);
 * `ip_cap` offers sign-up to signed-out visitors; `network` offers "Réessayer" when
 * `onRetry` is given.
 * @param {{failure: {code: string, message: string}, isLoggedIn: boolean,
 *   onRetry?: () => void, className?: string}} props
 */
export default function CreateFailureNotice({ failure, isLoggedIn, onRetry, className }) {
    const location = useLocation();
    const authState = { from: location };
    const quota = failure.code === "anon_quota" || failure.code === "ip_cap";

    return (
        <Notice tone={quota ? "warning" : "error"} className={className}>
            <p>{failure.message}</p>
            {failure.code === "anon_quota" && (
                <div className={styles.actions}>
                    <Button size="sm" to="/inscription" state={authState}>
                        Créer un compte
                    </Button>
                    <Button size="sm" variant="secondary" to="/connexion" state={authState}>
                        Se connecter
                    </Button>
                </div>
            )}
            {failure.code === "ip_cap" && !isLoggedIn && (
                <div className={styles.actions}>
                    <Button size="sm" variant="secondary" to="/inscription" state={authState}>
                        Créer un compte
                    </Button>
                </div>
            )}
            {failure.code === "network" && onRetry && (
                <div className={styles.actions}>
                    <Button size="sm" variant="secondary" onClick={onRetry}>
                        Réessayer
                    </Button>
                </div>
            )}
        </Notice>
    );
}
