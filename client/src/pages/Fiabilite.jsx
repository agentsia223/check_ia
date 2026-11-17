import { Link } from "react-router-dom";
import OutcomeBar from "../components/check/OutcomeBar";
import { usePageTitle } from "../hooks/usePageTitle";
import { fiabilite, pctFr } from "../data/fiabilite";
import styles from "./Prose.module.css";

/** Reliability page (French). Every number comes from data/fiabilite.js. */
export default function Fiabilite() {
    usePageTitle("Fiabilité");
    const { version, date, n, nPrimary, correct, prudence, wrong, decisive, falseValidated, medianSeconds } =
        fiabilite;

    const segments = [
        { key: "correct", value: correct, color: "var(--green-700)", label: pctFr(correct) },
        { key: "prudence", value: prudence, color: "var(--navy-500)", label: pctFr(prudence) },
        { key: "wrong", value: wrong, color: "var(--red-700)", label: pctFr(wrong) },
    ];

    const barLabel =
        `Répartition des issues : ${pctFr(correct)} verdict correct, ` +
        `${pctFr(prudence)} prudence, ${pctFr(wrong)} verdict erroné.`;

    return (
        <article className={styles.page}>
            <Link to="/reliability" className={styles.langSwitch} lang="en" hrefLang="en">
                English version
            </Link>

            <h1>Fiabilité de Check-IA</h1>

            <p className={styles.lead}>
                Check-IA est évalué régulièrement sur des vérifications réelles. Cette page présente les
                résultats de l'évaluation la plus récente, menée sur le système tel qu'il est en production.
            </p>

            <p className={styles.facts}>
                Évaluation {version} — {date} · {n} affirmations réelles · vérité de référence établie à partir
                de vérifications publiées par des fact-checkeurs indépendants
            </p>

            <h2>Comment lire ces chiffres</h2>
            <p>
                Quand Check-IA n'est pas sûr, il préfère ne pas trancher plutôt que deviner. Les résultats
                distinguent donc trois issues : verdict correct, prudence (pas de verdict), verdict erroné.
            </p>

            <h2>Résultats</h2>
            <p>Sur {nPrimary} affirmations au verdict de référence établi (vrai ou faux) :</p>

            <OutcomeBar segments={segments} ariaLabel={barLabel} />

            <ul>
                <li>
                    <strong>{pctFr(correct)}</strong> — verdict correct
                </li>
                <li>
                    <strong>{pctFr(prudence)}</strong> — prudence : Check-IA a préféré ne pas trancher
                </li>
                <li>
                    <strong>{pctFr(wrong)}</strong> — verdict erroné
                </li>
            </ul>

            <p>
                Quand Check-IA tranche, son verdict est exact dans <strong>{pctFr(decisive)}</strong> des cas.
            </p>
            <p>
                Fausses informations validées à tort comme vraies : <strong>{pctFr(falseValidated)}</strong>.
            </p>
            <p>
                Temps de réponse médian : environ <strong>{medianSeconds} secondes</strong>.
            </p>

            <h2>Méthodologie en bref</h2>
            <p>
                L'évaluation porte sur la vérification de textes en français. {n} affirmations ont été
                constituées à partir de vérifications publiées par des fact-checkeurs maliens indépendants
                (Benbere et Voix de Mopti), reformulées telles qu'un utilisateur les soumettrait. La vérité de
                référence a été ré-actualisée au regard des événements survenus jusqu'en {date}, puis chaque
                affirmation a été soumise au système en production. {nPrimary} affirmations ont un verdict de
                référence strictement vrai ou faux ; les {n - nPrimary} restantes relèvent de catégories nuancées
                (trompeur, hors contexte) et sont traitées à part dans la note méthodologique.
            </p>
            <p>
                Les fact-checkeurs cités sont les auteurs des vérifications d'origine ; ils n'ont ni supervisé ni
                approuvé cette évaluation.
            </p>
            <p>
                <a href="/methodologie-checkia-v1.pdf">Télécharger la note méthodologique (PDF)</a>
            </p>

            <h2>Limites</h2>
            <p>
                Le corpus est majoritairement composé d'affirmations fausses, à l'image des vérifications
                publiées par les fact-checkeurs. Les affirmations portant sur des images ou des vidéos ont des
                limites propres, détaillées dans la note méthodologique. Ces résultats datent de {date} ; les
                évaluations suivantes seront publiées sur cette page (v2, v3, …).
            </p>
        </article>
    );
}
