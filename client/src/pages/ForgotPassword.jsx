import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Notice from "../components/ui/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthCard, EMAIL_ERROR, isValidEmail } from "./authShared";
import styles from "./Auth.module.css";

export default function ForgotPassword() {
    usePageTitle("Mot de passe oublié");
    const { sendPasswordReset } = useAuth();
    const emailRef = useRef(null);
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        if (busy) return;
        setFormError("");
        if (!isValidEmail(email)) {
            setError(EMAIL_ERROR);
            return emailRef.current?.focus();
        }
        setError("");
        setBusy(true);
        const result = await sendPasswordReset(email.trim());
        setBusy(false);
        if (result.ok) setSent(true);
        else setFormError(result.message);
    }

    if (sent) {
        return (
            <AuthCard title="Vérifiez votre boîte mail">
                <p>
                    Si un compte existe pour <span className={styles.address}>{email.trim()}</span>, vous allez recevoir
                    un lien pour choisir un nouveau mot de passe.
                </p>
                <p className={styles.intro}>Rien reçu ? Regardez dans vos courriers indésirables.</p>
                <Button to="/connexion" variant="secondary">
                    Retour à la connexion
                </Button>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Mot de passe oublié"
            intro="Indiquez votre adresse e-mail : nous vous enverrons un lien pour en choisir un nouveau."
        >
            {formError && <Notice tone="error">{formError}</Notice>}
            <form className={styles.form} onSubmit={onSubmit} noValidate>
                <Field
                    ref={emailRef}
                    label="Adresse e-mail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={error}
                />
                <Button type="submit" className={styles.submit} loading={busy}>
                    Envoyer le lien
                </Button>
            </form>
            <div className={styles.links}>
                <Link to="/connexion">Retour à la connexion</Link>
            </div>
        </AuthCard>
    );
}
