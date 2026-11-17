import CheckList from "../components/check/CheckList";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Library.module.css";

/** Public library of checks their authors chose to publish. */
export default function Library() {
    usePageTitle("Bibliothèque");
    return (
        <section className={styles.page}>
            <h1 className={styles.title}>Bibliothèque</h1>
            <p className={styles.lead}>
                Vérifications automatiques que leurs auteurs ont choisi de publier. Aucune n'est relue par la
                rédaction.
            </p>
            <CheckList
                scope="library"
                emptyTitle="Aucune vérification publiée pour le moment"
                emptyText="Les vérifications que leurs auteurs choisissent de publier apparaîtront ici."
                emptyAction={{ label: "Nouvelle vérification", to: "/" }}
            />
        </section>
    );
}
