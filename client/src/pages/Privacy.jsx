import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./Prose.module.css";

/** Privacy policy (text ported from the previous site; contact address unified). */
export default function Privacy() {
    usePageTitle("Politique de confidentialité");

    return (
        <article className={styles.page}>
            <h1>Politique de confidentialité</h1>
            <p className={styles.lead}>
                Bienvenue sur notre plateforme de fact-checking. Nous respectons votre vie privée et nous nous
                engageons à protéger vos informations personnelles. Cette politique de confidentialité explique
                comment nous collectons, utilisons et protégeons vos données.
            </p>

            <h2>1. Informations collectées</h2>
            <p>
                Nous collectons des informations que vous nous fournissez directement, telles que votre nom,
                votre adresse e-mail, et toute autre information que vous soumettez lors de votre inscription ou
                de la soumission de faits à vérifier. Nous pouvons également collecter des informations
                automatiquement via des cookies et d'autres technologies de suivi pour améliorer l'expérience
                utilisateur.
            </p>

            <h2>2. Utilisation des informations</h2>
            <p>
                Les informations collectées sont utilisées pour vous fournir nos services, vérifier les faits
                soumis, et améliorer la qualité de notre plateforme. Nous pouvons utiliser vos données pour vous
                envoyer des mises à jour sur notre plateforme ou répondre à vos questions. Aucune information
                personnelle ne sera partagée sans votre consentement, sauf en cas d'obligation légale.
            </p>

            <h2>3. Partage des informations</h2>
            <p>
                Nous ne partageons vos informations personnelles qu'avec des tiers de confiance nécessaires à la
                fourniture de nos services (comme nos partenaires technologiques), et uniquement dans le cadre de
                la protection de vos données. Nous nous engageons à ne pas vendre vos informations personnelles à
                des tiers.
            </p>

            <h2>4. Sécurité des données</h2>
            <p>
                Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données contre tout
                accès non autorisé, modification, divulgation ou destruction. Cependant, nous ne pouvons garantir
                une sécurité absolue, et vous reconnaissez que toute transmission de données présente des
                risques.
            </p>

            <h2>5. Vos droits</h2>
            <p>
                Vous avez le droit d'accéder, de corriger, de supprimer ou de limiter l'utilisation de vos
                informations personnelles. Vous pouvez nous contacter pour toute demande relative à vos données
                personnelles, et nous ferons de notre mieux pour répondre dans les meilleurs délais.
            </p>

            <h2>6. Utilisation des cookies</h2>
            <p>
                Notre plateforme utilise des cookies pour collecter des informations sur la façon dont vous
                utilisez notre site. Ces informations nous aident à améliorer nos services et à vous offrir une
                meilleure expérience. Vous pouvez configurer votre navigateur pour refuser les cookies, mais
                certaines fonctionnalités pourraient être limitées.
            </p>

            <h2>7. Modifications de la politique de confidentialité</h2>
            <p>
                Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Toute
                modification sera publiée sur cette page et prendra effet immédiatement après sa publication.
                Nous vous encourageons à consulter régulièrement cette page pour rester informé des
                modifications.
            </p>

            <h2>8. Contact</h2>
            <p>
                Pour toute question concernant cette politique de confidentialité, veuillez nous contacter à
                l'adresse suivante : <a href="mailto:contact@checkia.org">contact@checkia.org</a>.
            </p>
        </article>
    );
}
