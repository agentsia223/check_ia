import { Link } from "react-router-dom";
import Logo from "./Logo";
import styles from "./Footer.module.css";

const LINKS = [
    { to: "/bibliotheque", label: "Bibliothèque" },
    { to: "/fiabilite", label: "Fiabilité" },
    { to: "/conditions", label: "Conditions d'utilisation" },
    { to: "/confidentialite", label: "Politique de confidentialité" },
];

/** Site footer: short description, site and legal links, contact address. No props. */
export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.about}>
                    <Logo alt="Check-IA" />
                    <p className={styles.description}>
                        Check-IA vérifie les affirmations, les images et les messages vocaux en bambara qui
                        circulent au Mali et au Sahel, et cite ses sources. C'est un outil automatique : consultez
                        les sources avant de citer un verdict.
                    </p>
                </div>
                <nav aria-label="Liens du pied de page">
                    <ul role="list" className={styles.links}>
                        {LINKS.map((link) => (
                            <li key={link.to}>
                                <Link to={link.to} className={styles.link}>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <a href="mailto:contact@checkia.org" className={styles.link}>
                                contact@checkia.org
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            <p className={styles.legal}>© {new Date().getFullYear()} Check-IA</p>
        </footer>
    );
}
