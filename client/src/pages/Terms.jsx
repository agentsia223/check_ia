import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Prose.module.css";

/** Terms of use (text ported from the previous site). */
export default function Terms() {
    usePageTitle("Conditions d'utilisation");

    return (
        <article className={styles.page}>
            <h1>Conditions d'utilisation</h1>
            <p className={styles.lead}>
                Bienvenue sur Check-IA, une plateforme de fact-checking conçue pour les francophones d'Afrique de
                l'Ouest. En utilisant notre plateforme, vous acceptez de respecter les présentes conditions
                d'utilisation.
            </p>

            <h2>1. Utilisation de la plateforme</h2>
            <p>
                Notre plateforme est destinée à aider les utilisateurs à soumettre, vérifier, et consulter des
                informations factuelles. Vous vous engagez à utiliser les services de manière responsable, à des
                fins légales, et en respectant les autres utilisateurs. Toute utilisation abusive, telle que la
                diffusion de fausses informations intentionnelles, entraînera la suspension de votre compte.
            </p>

            <h2>2. Soumission de contenu</h2>
            <p>
                En soumettant un fait à vérifier, vous reconnaissez que vous êtes le propriétaire ou que vous
                avez les droits de diffuser le contenu. Vous nous accordez une licence non-exclusive pour
                l'utiliser aux fins de vérification et de partage sur la plateforme. Nous nous réservons le droit
                de rejeter ou de supprimer toute soumission inappropriée ou non conforme à notre politique.
            </p>

            <h2>3. Exactitude des informations</h2>
            <p>
                Nous nous efforçons de fournir des informations exactes et à jour, mais nous ne garantissons pas
                la précision complète des résultats de vérification. Nos analyses sont basées sur des modèles
                d'intelligence artificielle et des sources externes, et peuvent comporter des erreurs. Vous
                reconnaissez que les informations fournies sont à titre indicatif.
            </p>

            <h2>4. Responsabilité de l'utilisateur</h2>
            <p>
                Vous êtes seul responsable de l'utilisation que vous faites des informations obtenues sur notre
                plateforme. Nous ne pouvons être tenus responsables des décisions prises sur la base des
                informations fournies, notamment en cas de perte ou de dommage.
            </p>

            <h2>5. Protection des données</h2>
            <p>
                Nous respectons la vie privée de nos utilisateurs. Les informations personnelles recueillies sont
                traitées conformément à notre politique de confidentialité. Nous prenons toutes les mesures
                nécessaires pour protéger vos données contre toute utilisation non autorisée.
            </p>

            <h2>6. Modifications des conditions</h2>
            <p>
                Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment. Toute
                modification sera publiée sur cette page, et l'utilisation continue de la plateforme après
                publication vaut acceptation des nouvelles conditions.
            </p>

            <h2>7. Contact</h2>
            <p>
                Si vous avez des questions concernant ces conditions d'utilisation, veuillez nous contacter à
                l'adresse suivante : <a href="mailto:contact@checkia.org">contact@checkia.org</a>.
            </p>
        </article>
    );
}
