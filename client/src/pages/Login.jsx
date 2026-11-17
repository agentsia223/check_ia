import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Notice from "../components/ui/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthCard, EMAIL_ERROR, PasswordField, TermsLine, isValidEmail, returnTarget } from "./authShared";
import styles from "./Auth.module.css";

export default function Login() {
    usePageTitle("Connexion");
    const { signIn, isLoggedIn, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);

    const target = returnTarget(location);

    if (!authLoading && isLoggedIn) return <Navigate to={target} replace />;

    async function onSubmit(event) {
        event.preventDefault();
        if (busy) return;
        const next = {};
        if (!isValidEmail(email)) next.email = EMAIL_ERROR;
        if (!password) next.password = "Saisissez votre mot de passe.";
        setErrors(next);
        setFormError("");
        if (next.email) return emailRef.current?.focus();
        if (next.password) return passwordRef.current?.focus();

        setBusy(true);
        const result = await signIn(email.trim(), password);
        setBusy(false);
        if (result.ok) navigate(target, { replace: true });
        else setFormError(result.message);
    }

    return (
        <AuthCard title="Connexion" intro="Retrouvez vos vérifications et publiez vos résultats.">
            {location.state?.from && <Notice>Connectez-vous pour continuer.</Notice>}
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                />
                <Button type="submit" className={styles.submit} loading={busy}>
                    Se connecter
                </Button>
            </form>
            <div className={styles.links}>
                <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
                <span>
                    Pas encore de compte ?{" "}
                    <Link to="/inscription" state={location.state}>
                        Créer un compte
                    </Link>
                </span>
            </div>
            <TermsLine />
        </AuthCard>
    );
}
