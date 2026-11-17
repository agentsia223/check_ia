import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Notice from "../components/ui/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthCard, MIN_PASSWORD_LENGTH, PASSWORD_SHORT_ERROR, PasswordField } from "./authShared";
import styles from "./Auth.module.css";

export default function ResetPassword() {
    usePageTitle("Nouveau mot de passe");
    const { isLoggedIn, loading, updatePassword } = useAuth();
    const navigate = useNavigate();
    const passwordRef = useRef(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);

    if (loading) {
        return (
            <AuthCard title="Nouveau mot de passe">
                <p role="status">Chargement…</p>
            </AuthCard>
        );
    }

    if (!isLoggedIn) {
        return (
            <AuthCard title="Ce lien n'est plus valide" intro="Il a expiré ou a déjà été utilisé. Demandez-en un nouveau.">
                <Button to="/mot-de-passe-oublie">Demander un nouveau lien</Button>
            </AuthCard>
        );
    }

    async function onSubmit(event) {
        event.preventDefault();
        if (busy) return;
        setFormError("");
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(PASSWORD_SHORT_ERROR);
            return passwordRef.current?.focus();
        }
        setError("");
        setBusy(true);
        const result = await updatePassword(password);
        setBusy(false);
        if (result.ok) navigate("/", { replace: true });
        else setFormError(result.message);
    }

    return (
        <AuthCard title="Nouveau mot de passe" intro="Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.">
            {formError && <Notice tone="error">{formError}</Notice>}
            <form className={styles.form} onSubmit={onSubmit} noValidate>
                <PasswordField
                    ref={passwordRef}
                    label="Nouveau mot de passe"
                    autoComplete="new-password"
                    hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={error}
                />
                <Button type="submit" className={styles.submit} loading={busy}>
                    Enregistrer le mot de passe
                </Button>
            </form>
        </AuthCard>
    );
}
