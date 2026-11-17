import Button from "../components/ui/Button";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Prose.module.css";

/** 404 page for unknown routes, with a link home. */
export default function NotFound() {
    usePageTitle("Page introuvable");

    return (
        <article className={styles.page}>
            <h1>Page introuvable</h1>
            <p className={styles.lead}>
                Cette adresse ne correspond à aucune page de Check-IA. Le lien est peut-être incomplet ou la page
                a été déplacée.
            </p>
            <div className={styles.actions}>
                <Button to="/">Nouvelle vérification</Button>
                <Button to="/bibliotheque" variant="secondary">
                    Voir la bibliothèque
                </Button>
            </div>
        </article>
    );
}
