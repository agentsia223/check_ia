import CheckList from "../components/check/CheckList";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./History.module.css";

/** Signed-in user's own checks (wrapped in RequireAuth by App). */
export default function History() {
    usePageTitle("Mes vérifications");
    return (
        <section className={styles.page}>
            <h1 className={styles.title}>Mes vérifications</h1>
            <p className={styles.lead}>Toutes vos vérifications, publiées ou non.</p>
            <CheckList
                scope="mine"
                emptyTitle="Vous n'avez encore rien vérifié"
                emptyText="Vos vérifications apparaîtront ici dès la première."
                emptyAction={{ label: "Nouvelle vérification", to: "/" }}
            />
        </section>
    );
}
