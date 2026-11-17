import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/ui/Field";
import styles from "./Auth.module.css";

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_ERROR = "Saisissez une adresse e-mail valide.";
export const PASSWORD_SHORT_ERROR = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;

export function isValidEmail(value) {
    return EMAIL_RE.test(value.trim());
}

/** Centred card with a condensed title and one line of explanation. */
export function AuthCard({ title, intro, children }) {
    return (
        <section className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>{title}</h1>
                {intro && <p className={styles.intro}>{intro}</p>}
                {children}
            </div>
        </section>
    );
}

/** Password input with a real show/hide button. */
export const PasswordField = forwardRef(function PasswordField({ label = "Mot de passe", ...props }, ref) {
    const [shown, setShown] = useState(false);
    return (
        <Field
            ref={ref}
            label={label}
            type={shown ? "text" : "password"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            trailing={
                <button type="button" className={styles.toggle} onClick={() => setShown((s) => !s)}>
                    {shown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                </button>
            }
            {...props}
        />
    );
});

export function TermsLine() {
    return (
        <p className={styles.terms}>
            En continuant, vous acceptez nos <Link to="/conditions">conditions d'utilisation</Link> et notre{" "}
            <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
    );
}
