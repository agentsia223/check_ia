import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Notice from "../components/ui/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import {
    AuthCard,
    EMAIL_ERROR,
    MIN_PASSWORD_LENGTH,
    PASSWORD_SHORT_ERROR,
    PasswordField,
    TermsLine,
    isValidEmail,
} from "./authShared";
import styles from "./Auth.module.css";

export default function Register() {
    usePageTitle("Créer un compte");
    const { signUp, isLoggedIn, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const target = location.state?.from?.pathname ?? "/";
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sentTo, setSentTo] = useState("");

    if (!authLoading && isLoggedIn) return <Navigate to={target} replace />;

    async function onSubmit(event) {
        event.preventDefault();
        if (busy) return;
        const next = {};
        if (!isValidEmail(email)) next.email = EMAIL_ERROR;
        if (password.length < MIN_PASSWORD_LENGTH) next.password = PASSWORD_SHORT_ERROR;
        setErrors(next);
        setFormError("");
        if (next.email) return emailRef.current?.focus();
        if (next.password) return passwordRef.current?.focus();

        setBusy(true);
        const result = await signUp(email.trim(), password);
        setBusy(false);
        if (!result.ok) return setFormError(result.message);
        // Signed in straight away (no e-mail confirmation): leave the form.
        if (result.hasSession) return navigate(target, { replace: true });
        // Otherwise ask the user to confirm by e-mail.
        setSentTo(email.trim());
    }

    if (sentTo) {
        return (
            <AuthCard title="Vérifiez votre boîte mail">
                <p>
                    Nous avons envoyé un lien de confirmation à <span className={styles.address}>{sentTo}</span>.
                    Ouvrez-le pour activer votre compte, puis connectez-vous.
                </p>
                <p className={styles.intro}>Rien reçu ? Regardez dans vos courriers indésirables.</p>
                <Button to="/connexion" state={location.state} variant="secondary">
                    Aller à la connexion
                </Button>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Créer un compte" intro="Gratuit. Il suffit d'une adresse e-mail et d'un mot de passe.">
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
                    error={errors.email}
                />
                <PasswordField
                    ref={passwordRef}
                    autoComplete="new-password"
                    hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                />
                <Button type="submit" className={styles.submit} loading={busy}>
                    Créer mon compte
                </Button>
            </form>
            <div className={styles.links}>
                <span>
                    Déjà un compte ?{" "}
                    <Link to="/connexion" state={location.state}>
                        Se connecter
                    </Link>
                </span>
            </div>
            <TermsLine />
        </AuthCard>
    );
}
